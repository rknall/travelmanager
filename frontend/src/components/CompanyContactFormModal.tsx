// SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
// SPDX-License-Identifier: GPL-2.0-only

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { api } from '@/api/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { CompanyContact, ContactType } from '@/types'
import { ContactTypeSelect } from './ContactTypeSelect'

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().max(50).optional(),
  title: z.string().max(200).optional(),
  department: z.string().max(200).optional(),
  notes: z.string().optional(),
  contact_types: z.array(z.string()),
})

type ContactFormData = z.infer<typeof contactSchema>

interface CompanyContactFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  companyId: string
  contact?: CompanyContact | null
}

export function CompanyContactFormModal({
  isOpen,
  onClose,
  onSuccess,
  companyId,
  contact,
}: CompanyContactFormModalProps) {
  const isEditMode = !!contact
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    mode: 'onBlur',
  })

  useEffect(() => {
    if (isOpen) {
      if (contact) {
        reset({
          name: contact.name,
          email: contact.email,
          phone: contact.phone || '',
          title: contact.title || '',
          department: contact.department || '',
          notes: contact.notes || '',
          contact_types: contact.contact_types || [],
        })
      } else {
        reset({
          name: '',
          email: '',
          phone: '',
          title: '',
          department: '',
          notes: '',
          contact_types: [],
        })
      }
      setError(null)
    }
  }, [isOpen, contact, reset])

  const handleClose = () => {
    onClose()
  }

  const onSubmit = async (data: ContactFormData) => {
    setIsSaving(true)
    setError(null)

    try {
      const payload = {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        title: data.title || null,
        department: data.department || null,
        notes: data.notes || null,
        contact_types: data.contact_types as ContactType[],
      }

      if (isEditMode && contact) {
        await api.put(`/companies/${companyId}/contacts/${contact.id}`, payload)
      } else {
        await api.post(`/companies/${companyId}/contacts`, payload)
      }

      onSuccess()
      handleClose()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : `Failed to ${isEditMode ? 'update' : 'create'} contact`,
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Edit Contact' : 'Add Contact'}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

        <Input label="Name" {...register('name')} error={errors.name?.message} />

        <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />

        <Input label="Phone" {...register('phone')} error={errors.phone?.message} />

        <div className="grid grid-cols-2 gap-4">
          <Input label="Title" {...register('title')} error={errors.title?.message} />

          <Input
            label="Department"
            {...register('department')}
            error={errors.department?.message}
          />
        </div>

        <Controller
          name="contact_types"
          control={control}
          render={({ field }) => (
            <ContactTypeSelect
              label="Contact Types"
              value={field.value as ContactType[]}
              onChange={field.onChange}
              error={errors.contact_types?.message}
            />
          )}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            {...register('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {isEditMode ? 'Save Changes' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
