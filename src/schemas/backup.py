# SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
# SPDX-License-Identifier: GPL-2.0-only
"""Backup and restore schemas."""
from datetime import datetime

from pydantic import BaseModel


class BackupMetadata(BaseModel):
    """Metadata about a backup file."""

    version: str
    created_at: datetime
    created_by: str
    db_size_bytes: int
    avatar_count: int
    checksum: str


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
