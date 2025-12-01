// SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
// SPDX-License-Identifier: GPL-2.0-only
import { useEffect, useState, useRef } from 'react'
import { useBreadcrumb } from '@/stores/breadcrumb'
import {
  api,
  downloadBackup,
  uploadBackupForValidation,
  performRestore,
} from '@/api/client'
import type { BackupInfo, RestoreValidationResponse, RestoreResponse } from '@/types'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { Modal } from '@/components/ui/Modal'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function BackupSettings() {
  const { setItems: setBreadcrumb } = useBreadcrumb()
  const [backupInfo, setBackupInfo] = useState<BackupInfo | null>(null)
  const [isLoadingInfo, setIsLoadingInfo] = useState(true)
  const [isCreatingBackup, setIsCreatingBackup] = useState(false)
  const [backupError, setBackupError] = useState<string | null>(null)
  const [backupSuccess, setBackupSuccess] = useState(false)

  // Restore state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] =
    useState<RestoreValidationResponse | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreResult, setRestoreResult] = useState<RestoreResponse | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setBreadcrumb([{ label: 'Settings', href: '/settings' }, { label: 'Backup' }])
  }, [setBreadcrumb])

  useEffect(() => {
    fetchBackupInfo()
  }, [])

  const fetchBackupInfo = async () => {
    try {
      const info = await api.get<BackupInfo>('/backup/info')
      setBackupInfo(info)
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : 'Failed to load backup info')
    } finally {
      setIsLoadingInfo(false)
    }
  }

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true)
    setBackupError(null)
    setBackupSuccess(false)
    try {
      await downloadBackup()
      setBackupSuccess(true)
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : 'Failed to create backup')
    } finally {
      setIsCreatingBackup(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setValidationResult(null)
      setRestoreResult(null)
    }
  }

  const handleValidate = async () => {
    if (!selectedFile) return
    setIsValidating(true)
    setValidationResult(null)
    try {
      const result = await uploadBackupForValidation(selectedFile)
      setValidationResult(result)
    } catch (e) {
      setValidationResult({
        valid: false,
        message: e instanceof Error ? e.message : 'Validation failed',
        metadata: null,
        warnings: [],
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleRestore = async () => {
    if (!selectedFile) return
    setShowConfirmModal(false)
    setIsRestoring(true)
    try {
      const result = await performRestore(selectedFile)
      setRestoreResult(result)
    } catch (e) {
      setRestoreResult({
        success: false,
        message: e instanceof Error ? e.message : 'Restore failed',
        requires_restart: false,
      })
    } finally {
      setIsRestoring(false)
    }
  }

  const resetRestore = () => {
    setSelectedFile(null)
    setValidationResult(null)
    setRestoreResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Backup & Restore</h1>

      {/* Create Backup Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Create Backup</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingInfo ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : (
            <>
              {backupError && (
                <Alert variant="error" className="mb-4">
                  {backupError}
                </Alert>
              )}
              {backupSuccess && (
                <Alert variant="success" className="mb-4">
                  Backup created and downloaded successfully.
                </Alert>
              )}

              {backupInfo && (
                <div className="mb-4 space-y-2 text-sm text-gray-600">
                  <p>
                    Database:{' '}
                    {backupInfo.database_exists
                      ? formatBytes(backupInfo.database_size_bytes)
                      : 'Not found'}
                  </p>
                  <p>Avatars: {backupInfo.avatar_count} file(s)</p>
                </div>
              )}

              <Button onClick={handleCreateBackup} isLoading={isCreatingBackup}>
                Create Backup
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Restore Section */}
      <Card>
        <CardHeader>
          <CardTitle>Restore from Backup</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="warning" className="mb-4">
            Restoring a backup will replace all current data. A pre-restore backup will
            be created automatically. The application will need to be restarted after
            restore.
          </Alert>

          {restoreResult && (
            <Alert
              variant={restoreResult.success ? 'success' : 'error'}
              className="mb-4"
            >
              {restoreResult.message}
              {restoreResult.success && restoreResult.requires_restart && (
                <div className="mt-2 font-medium">
                  Please restart the application now to apply the restored data.
                </div>
              )}
            </Alert>
          )}

          {!restoreResult?.success && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select backup file (.tar.gz)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".tar.gz,.tgz"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>

              {selectedFile && (
                <div className="text-sm text-gray-600">
                  Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
                </div>
              )}

              {validationResult && (
                <Alert
                  variant={validationResult.valid ? 'success' : 'error'}
                  className="mt-4"
                >
                  <div>{validationResult.message}</div>
                  {validationResult.warnings.length > 0 && (
                    <ul className="mt-2 list-disc list-inside">
                      {validationResult.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  )}
                  {validationResult.metadata && (
                    <div className="mt-2 text-xs">
                      <p>Version: {validationResult.metadata.version}</p>
                      <p>
                        Created:{' '}
                        {new Date(validationResult.metadata.created_at).toLocaleString()}
                      </p>
                      <p>Created by: {validationResult.metadata.created_by}</p>
                      <p>
                        Database size:{' '}
                        {formatBytes(validationResult.metadata.db_size_bytes)}
                      </p>
                      <p>Avatars: {validationResult.metadata.avatar_count}</p>
                    </div>
                  )}
                </Alert>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleValidate}
                  disabled={!selectedFile}
                  isLoading={isValidating}
                  variant="secondary"
                >
                  Validate Backup
                </Button>
                <Button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={!validationResult?.valid}
                  isLoading={isRestoring}
                  variant="danger"
                >
                  Restore Backup
                </Button>
                {selectedFile && (
                  <Button onClick={resetRestore} variant="ghost">
                    Clear
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Confirm Restore"
      >
        <div className="space-y-4">
          <p>Are you sure you want to restore from this backup? This will:</p>
          <ul className="list-disc list-inside text-sm text-gray-600">
            <li>Create a backup of current data</li>
            <li>Replace the database with the backup version</li>
            <li>Replace all avatar files</li>
            <li>Require an application restart</li>
          </ul>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRestore}>
              Yes, Restore
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
