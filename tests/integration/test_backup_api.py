# SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
# SPDX-License-Identifier: GPL-2.0-only
"""Integration tests for backup API endpoints."""
import io
import shutil
import sqlite3
import tarfile
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from src.services import backup_service


@pytest.fixture
def temp_backup_dirs():
    """Create temporary directories for backup testing."""
    temp_dir = tempfile.mkdtemp()
    data_dir = Path(temp_dir) / "data"
    data_dir.mkdir()
    avatar_dir = Path(temp_dir) / "static" / "avatars"
    avatar_dir.mkdir(parents=True)

    # Create a test database
    db_path = data_dir / "travel_manager.db"
    conn = sqlite3.connect(str(db_path))
    conn.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)")
    conn.execute("INSERT INTO test VALUES (1, 'test')")
    conn.commit()
    conn.close()

    # Create some test avatar files
    (avatar_dir / "avatar1.jpg").write_bytes(b"fake image 1")

    yield temp_dir, data_dir, avatar_dir, db_path

    # Cleanup
    shutil.rmtree(temp_dir)


@pytest.fixture
def mock_backup_paths(temp_backup_dirs):
    """Mock the backup service paths for API tests."""
    temp_dir, data_dir, avatar_dir, db_path = temp_backup_dirs

    with patch.object(backup_service, "DATA_DIR", data_dir), \
         patch.object(backup_service, "AVATAR_DIR", avatar_dir), \
         patch.object(backup_service, "DB_PATH", db_path), \
         patch.object(backup_service, "PRE_RESTORE_BACKUP_DIR", Path(temp_dir) / "backups" / "pre_restore"):
        yield temp_dir, data_dir, avatar_dir, db_path


class TestBackupInfoEndpoint:
    """Tests for GET /api/v1/backup/info endpoint."""

    def test_requires_authentication(self, client):
        """Test that endpoint requires authentication."""
        response = client.get("/api/v1/backup/info")
        assert response.status_code == 401

    def test_requires_admin(self, authenticated_client):
        """Test that endpoint requires admin role."""
        response = authenticated_client.get("/api/v1/backup/info")
        assert response.status_code == 403

    def test_returns_backup_info(self, admin_client, mock_backup_paths):
        """Test that endpoint returns backup information."""
        response = admin_client.get("/api/v1/backup/info")

        assert response.status_code == 200
        data = response.json()
        assert "database_exists" in data
        assert "database_size_bytes" in data
        assert "avatar_count" in data
        assert data["database_exists"] is True
        assert data["avatar_count"] == 1


class TestCreateBackupEndpoint:
    """Tests for POST /api/v1/backup/create endpoint."""

    def test_requires_authentication(self, client):
        """Test that endpoint requires authentication."""
        response = client.post("/api/v1/backup/create")
        assert response.status_code == 401

    def test_requires_admin(self, authenticated_client):
        """Test that endpoint requires admin role."""
        response = authenticated_client.post("/api/v1/backup/create")
        assert response.status_code == 403

    def test_creates_and_downloads_backup(self, admin_client, mock_backup_paths):
        """Test that endpoint creates and returns a backup file."""
        response = admin_client.post("/api/v1/backup/create")

        assert response.status_code == 200
        assert response.headers["content-type"] == "application/gzip"
        assert "content-disposition" in response.headers
        assert "attachment" in response.headers["content-disposition"]
        assert ".tar.gz" in response.headers["content-disposition"]

        # Verify it's a valid tarball
        content = response.content
        with tarfile.open(fileobj=io.BytesIO(content), mode="r:gz") as tar:
            names = tar.getnames()
            assert any("travel_manager.db" in name for name in names)
            assert any("manifest.json" in name for name in names)


class TestValidateBackupEndpoint:
    """Tests for POST /api/v1/backup/validate endpoint."""

    def test_requires_authentication(self, client, mock_backup_paths):
        """Test that endpoint requires authentication."""
        backup_bytes, _ = backup_service.create_backup("testuser")
        response = client.post(
            "/api/v1/backup/validate",
            files={"file": ("backup.tar.gz", io.BytesIO(backup_bytes), "application/gzip")},
        )
        assert response.status_code == 401

    def test_requires_admin(self, authenticated_client, mock_backup_paths):
        """Test that endpoint requires admin role."""
        backup_bytes, _ = backup_service.create_backup("testuser")
        response = authenticated_client.post(
            "/api/v1/backup/validate",
            files={"file": ("backup.tar.gz", io.BytesIO(backup_bytes), "application/gzip")},
        )
        assert response.status_code == 403

    def test_validates_valid_backup(self, admin_client, mock_backup_paths):
        """Test validation of a valid backup file."""
        backup_bytes, _ = backup_service.create_backup("testuser")
        response = admin_client.post(
            "/api/v1/backup/validate",
            files={"file": ("backup.tar.gz", io.BytesIO(backup_bytes), "application/gzip")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is True
        assert data["metadata"] is not None
        assert data["metadata"]["version"] == "0.2.0"
        assert data["metadata"]["has_secret_key"] is True

    def test_rejects_invalid_backup(self, admin_client, mock_backup_paths):
        """Test rejection of invalid backup file."""
        response = admin_client.post(
            "/api/v1/backup/validate",
            files={"file": ("backup.tar.gz", io.BytesIO(b"invalid data"), "application/gzip")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["valid"] is False
        assert data["metadata"] is None


class TestRestoreBackupEndpoint:
    """Tests for POST /api/v1/backup/restore endpoint."""

    def test_requires_authentication(self, client, mock_backup_paths):
        """Test that endpoint requires authentication."""
        backup_bytes, _ = backup_service.create_backup("testuser")
        response = client.post(
            "/api/v1/backup/restore",
            files={"file": ("backup.tar.gz", io.BytesIO(backup_bytes), "application/gzip")},
        )
        assert response.status_code == 401

    def test_requires_admin(self, authenticated_client, mock_backup_paths):
        """Test that endpoint requires admin role."""
        backup_bytes, _ = backup_service.create_backup("testuser")
        response = authenticated_client.post(
            "/api/v1/backup/restore",
            files={"file": ("backup.tar.gz", io.BytesIO(backup_bytes), "application/gzip")},
        )
        assert response.status_code == 403

    def test_restores_valid_backup(self, admin_client, mock_backup_paths):
        """Test restore of a valid backup file."""
        backup_bytes, _ = backup_service.create_backup("testuser")
        response = admin_client.post(
            "/api/v1/backup/restore",
            files={"file": ("backup.tar.gz", io.BytesIO(backup_bytes), "application/gzip")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["requires_restart"] is True
        assert "restart" in data["message"].lower()

    def test_rejects_invalid_backup(self, admin_client, mock_backup_paths):
        """Test rejection of invalid backup during restore."""
        response = admin_client.post(
            "/api/v1/backup/restore",
            files={"file": ("backup.tar.gz", io.BytesIO(b"invalid data"), "application/gzip")},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False
        assert data["requires_restart"] is False
