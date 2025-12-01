# SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
# SPDX-License-Identifier: GPL-2.0-only
"""Backup and restore service."""
import hashlib
import json
import shutil
import sqlite3
import tarfile
import tempfile
from datetime import UTC, datetime
from pathlib import Path

from src.config import settings

# Derive paths from database URL
DATA_DIR = Path("./data")
AVATAR_DIR = Path("./static/avatars")
DB_PATH = DATA_DIR / "travel_manager.db"
PRE_RESTORE_BACKUP_DIR = Path("./backups/pre_restore")

# If using custom database URL, extract the path
if settings.database_url.startswith("sqlite:///"):
    db_path_str = settings.database_url.replace("sqlite:///", "")
    if db_path_str.startswith("./"):
        db_path_str = db_path_str[2:]
    DB_PATH = Path(db_path_str)
    DATA_DIR = DB_PATH.parent


def get_backup_info() -> dict:
    """Get information about current data that would be backed up."""
    db_exists = DB_PATH.exists()
    db_size = DB_PATH.stat().st_size if db_exists else 0
    avatar_count = len(list(AVATAR_DIR.glob("*"))) if AVATAR_DIR.exists() else 0

    return {
        "database_exists": db_exists,
        "database_size_bytes": db_size,
        "avatar_count": avatar_count,
    }


def create_backup(username: str) -> tuple[bytes, str]:
    """Create a backup tarball and return (bytes, filename)."""
    timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
    backup_name = f"travel_manager_backup_{timestamp}"

    with tempfile.TemporaryDirectory() as temp_dir:
        backup_dir = Path(temp_dir) / backup_name
        backup_dir.mkdir()

        # Safe SQLite backup using .backup command
        if DB_PATH.exists():
            dest_db = backup_dir / "travel_manager.db"
            conn = sqlite3.connect(str(DB_PATH))
            backup_conn = sqlite3.connect(str(dest_db))
            conn.backup(backup_conn)
            conn.close()
            backup_conn.close()

        # Copy avatars
        if AVATAR_DIR.exists() and any(AVATAR_DIR.iterdir()):
            shutil.copytree(AVATAR_DIR, backup_dir / "avatars")

        # Create manifest
        db_file = backup_dir / "travel_manager.db"
        db_size = db_file.stat().st_size if db_file.exists() else 0
        avatar_dir = backup_dir / "avatars"
        avatar_count = len(list(avatar_dir.glob("*"))) if avatar_dir.exists() else 0

        # Calculate checksum
        checksum = ""
        if db_file.exists():
            with open(db_file, "rb") as f:
                checksum = hashlib.sha256(f.read()).hexdigest()

        manifest = {
            "version": "0.1.1",
            "created_at": datetime.now(UTC).isoformat(),
            "created_by": username,
            "db_size_bytes": db_size,
            "avatar_count": avatar_count,
            "checksum": checksum,
        }

        with open(backup_dir / "manifest.json", "w") as f:
            json.dump(manifest, f, indent=2)

        # Create tarball
        tarball_path = Path(temp_dir) / f"{backup_name}.tar.gz"
        with tarfile.open(tarball_path, "w:gz") as tar:
            tar.add(backup_dir, arcname=backup_name)

        with open(tarball_path, "rb") as f:
            return f.read(), f"{backup_name}.tar.gz"


def validate_backup(file_bytes: bytes) -> tuple[bool, str, dict | None, list[str]]:
    """Validate an uploaded backup file.

    Returns: (valid, message, metadata, warnings)
    """
    warnings: list[str] = []

    with tempfile.TemporaryDirectory() as temp_dir:
        tarball_path = Path(temp_dir) / "upload.tar.gz"
        with open(tarball_path, "wb") as f:
            f.write(file_bytes)

        # Try to extract
        try:
            with tarfile.open(tarball_path, "r:gz") as tar:
                # Security check: ensure no absolute paths or path traversal
                for member in tar.getmembers():
                    if member.name.startswith("/") or ".." in member.name:
                        return False, "Invalid backup file: contains unsafe paths", None, []
                tar.extractall(temp_dir)
        except tarfile.TarError:
            return False, "Invalid or corrupted backup file", None, []

        # Find the backup directory
        subdirs = [d for d in Path(temp_dir).iterdir() if d.is_dir()]
        if not subdirs:
            return False, "Backup archive is empty", None, []

        backup_dir = subdirs[0]

        # Check for manifest
        manifest_path = backup_dir / "manifest.json"
        if not manifest_path.exists():
            warnings.append("No manifest.json found - backup may be from an older version")
            # Create synthetic metadata
            metadata = {
                "version": "unknown",
                "created_at": datetime.now(UTC).isoformat(),
                "created_by": "unknown",
                "db_size_bytes": 0,
                "avatar_count": 0,
                "checksum": "",
            }
        else:
            with open(manifest_path) as f:
                metadata = json.load(f)

        # Check database file
        db_path = backup_dir / "travel_manager.db"
        if not db_path.exists():
            return False, "No database file found in backup", None, []

        # Verify SQLite header
        with open(db_path, "rb") as f:
            header = f.read(16)
        if not header.startswith(b"SQLite format 3"):
            return False, "Database file is not a valid SQLite database", None, []

        # Update metadata with actual values
        metadata["db_size_bytes"] = db_path.stat().st_size
        avatar_dir = backup_dir / "avatars"
        metadata["avatar_count"] = len(list(avatar_dir.glob("*"))) if avatar_dir.exists() else 0

        return True, "Backup is valid", metadata, warnings


def perform_restore(file_bytes: bytes) -> tuple[bool, str]:
    """Perform the actual restore operation.

    Returns: (success, message)
    """
    # First validate
    valid, message, _, _ = validate_backup(file_bytes)
    if not valid:
        return False, message

    # Create pre-restore backup
    try:
        pre_backup_bytes, _ = create_backup("system_pre_restore")
        # Save pre-restore backup
        PRE_RESTORE_BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(UTC).strftime("%Y%m%d_%H%M%S")
        with open(PRE_RESTORE_BACKUP_DIR / f"pre_restore_{timestamp}.tar.gz", "wb") as f:
            f.write(pre_backup_bytes)
    except Exception as e:
        return False, f"Failed to create pre-restore backup: {e!s}"

    # Extract and restore
    with tempfile.TemporaryDirectory() as temp_dir:
        tarball_path = Path(temp_dir) / "upload.tar.gz"
        with open(tarball_path, "wb") as f:
            f.write(file_bytes)

        with tarfile.open(tarball_path, "r:gz") as tar:
            tar.extractall(temp_dir)

        subdirs = [d for d in Path(temp_dir).iterdir() if d.is_dir()]
        backup_dir = subdirs[0]

        # Replace database
        src_db = backup_dir / "travel_manager.db"
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src_db, DB_PATH)

        # Replace avatars
        src_avatars = backup_dir / "avatars"
        if src_avatars.exists():
            if AVATAR_DIR.exists():
                shutil.rmtree(AVATAR_DIR)
            shutil.copytree(src_avatars, AVATAR_DIR)
        elif AVATAR_DIR.exists():
            # Backup had no avatars, clear existing
            shutil.rmtree(AVATAR_DIR)
            AVATAR_DIR.mkdir(parents=True, exist_ok=True)

    return True, "Restore completed. Please restart the application to apply changes."
