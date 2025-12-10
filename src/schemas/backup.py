# SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
# SPDX-License-Identifier: GPL-2.0-only
"""Backup and restore schemas."""

from datetime import datetime

from pydantic import BaseModel, Field


class BackupCreateRequest(BaseModel):
    """Request to create a password-protected backup."""

    password: str = Field(
        ...,
        min_length=8,
        description="Password to encrypt the backup (minimum 8 characters)",
    )


class BackupMetadata(BaseModel):
    """Metadata about a backup file."""

    backup_format_version: str = "unknown"
    created_at: datetime | str | None = None
    created_by: str = "unknown"
    db_size_bytes: int = 0
    avatar_count: int = 0
    checksum: str = ""
    is_password_protected: bool = False
    has_legacy_secret_key: bool = False
    integration_config_count: int = 0


class BackupInfoResponse(BaseModel):
    """Response with current backup information."""

    database_exists: bool
    database_size_bytes: int
    avatar_count: int


class RestoreValidationResponse(BaseModel):
    """Response after validating an uploaded backup."""

    valid: bool
    message: str
    metadata: BackupMetadata | None = None
    warnings: list[str] = []


class RestoreResponse(BaseModel):
    """Response after restore operation."""

    success: bool
    message: str
    requires_restart: bool = True
    migrations_run: bool = False
    migrations_message: str = ""
    configs_imported: int = 0
