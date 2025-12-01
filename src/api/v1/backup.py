# SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
# SPDX-License-Identifier: GPL-2.0-only
"""Backup and restore API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import Response

from src.api.deps import get_current_admin
from src.models import User
from src.schemas.backup import (
    BackupInfoResponse,
    BackupMetadata,
    RestoreResponse,
    RestoreValidationResponse,
)
from src.services import backup_service

router = APIRouter()

MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500MB


@router.get("/info", response_model=BackupInfoResponse)
def get_backup_info(
    current_user: User = Depends(get_current_admin),
) -> BackupInfoResponse:
    """Get information about current backup state."""
    info = backup_service.get_backup_info()
    return BackupInfoResponse(**info)


@router.post("/create")
def create_backup(
    current_user: User = Depends(get_current_admin),
) -> Response:
    """Create and download a backup."""
    try:
        backup_bytes, filename = backup_service.create_backup(current_user.username)
        return Response(
            content=backup_bytes,
            media_type="application/gzip",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
            },
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create backup: {e!s}",
        ) from e


@router.post("/validate", response_model=RestoreValidationResponse)
async def validate_backup(
    file: UploadFile,
    current_user: User = Depends(get_current_admin),
) -> RestoreValidationResponse:
    """Validate an uploaded backup file before restore."""
    content = await file.read()

    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
        )

    valid, message, metadata, warnings = backup_service.validate_backup(content)

    return RestoreValidationResponse(
        valid=valid,
        message=message,
        metadata=BackupMetadata(**metadata) if metadata else None,
        warnings=warnings,
    )


@router.post("/restore", response_model=RestoreResponse)
async def restore_backup(
    file: UploadFile,
    current_user: User = Depends(get_current_admin),
) -> RestoreResponse:
    """Restore from an uploaded backup file."""
    content = await file.read()

    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
        )

    success, message = backup_service.perform_restore(content)

    return RestoreResponse(
        success=success,
        message=message,
        requires_restart=success,
    )
