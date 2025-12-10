// SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
// SPDX-License-Identifier: GPL-2.0-only

import { ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { CompanyFormModal } from '@/components/CompanyFormModal'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useBreadcrumb } from '@/stores/breadcrumb'
import type { Company } from '@/types'

export function Companies() {
  const navigate = useNavigate()
  const { setItems: setBreadcrumb } = useBreadcrumb()
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    try {
      const data = await api.get<Company[]>('/companies')
      setCompanies(data)
    } catch {
      setError('Failed to load companies')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    setBreadcrumb([{ label: 'Companies' }])
  }, [setBreadcrumb])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  const deleteCompany = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this company?')) return
    try {
      await api.delete(`/companies/${id}`)
      await fetchCompanies()
    } catch {
      setError('Failed to delete company')
    }
  }

  const openEditModal = (e: React.MouseEvent, company: Company) => {
    e.stopPropagation()
    setEditingCompany(company)
  }

  const handleCompanyCreated = (company?: Company) => {
    if (company) {
      navigate(`/companies/${company.id}`)
    }
  }

  const handleCompanyUpdated = () => {
    fetchCompanies()
    setEditingCompany(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Company
        </Button>
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : companies.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No companies yet. Add your first company to get started.
            </p>
          ) : (
            <div className="divide-y divide-gray-200">
              {companies.map((company) => (
                <button
                  type="button"
                  key={company.id}
                  className="flex items-center justify-between py-4 cursor-pointer hover:bg-gray-50 -mx-4 px-4 rounded w-full text-left"
                  onClick={() => navigate(`/companies/${company.id}`)}
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{company.name}</h3>
                    <p className="text-sm text-gray-500">
                      {company.contacts?.find((c) => c.is_main_contact)?.email || 'No main contact'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={company.type === 'employer' ? 'info' : 'default'}>
                      {company.type === 'employer' ? 'Employer' : 'Third Party'}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => openEditModal(e, company)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Edit company"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => deleteCompany(e, company.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete company"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Company Modal */}
      <CompanyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCompanyCreated}
      />

      {/* Edit Company Modal */}
      <CompanyFormModal
        isOpen={!!editingCompany}
        onClose={() => setEditingCompany(null)}
        onSuccess={handleCompanyUpdated}
        company={editingCompany}
      />
    </div>
  )
}
