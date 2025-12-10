// SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
// SPDX-License-Identifier: GPL-2.0-only

import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { api } from '@/api/client'
import { LocationAutocomplete } from '@/components/LocationAutocomplete'
import { UnsplashImagePicker } from '@/components/UnsplashImagePicker'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import type { Company, Event, EventCustomFieldChoices } from '@/types'

const eventSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  company_id: z.string().min(1, 'Company is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  paperless_custom_field_value: z.string().optional(),
})

type EventFormData = z.infer<typeof eventSchema>

interface LocationValue {
  city: string | null
  country: string | null
  country_code: string | null
  latitude: number | null
  longitude: number | null
}

interface CoverImageValue {
  image_url: string | null
  thumbnail_url: string | null
  photographer_name: string | null
  photographer_url: string | null
}

interface EventFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (event?: Event) => void
  event?: Event | null // If provided, it's edit mode; otherwise, create mode
  companies: Company[]
  customFieldChoices: EventCustomFieldChoices | null
}

export function EventFormModal({
  isOpen,
  onClose,
  onSuccess,
  event,
  companies,
  customFieldChoices,
}: EventFormModalProps) {
  const isEditMode = !!event
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreatingNewCustomField, setIsCreatingNewCustomField] = useState(false)
  const [newCustomFieldValue, setNewCustomFieldValue] = useState('')

  const [location, setLocation] = useState<LocationValue>({
    city: null,
    country: null,
    country_code: null,
    latitude: null,
    longitude: null,
  })

  const [coverImage, setCoverImage] = useState<CoverImageValue | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
  })

  // Reset form when modal opens/closes or event changes
  useEffect(() => {
    if (isOpen) {
      if (event) {
        reset({
          name: event.name,
          description: event.description || '',
          company_id: event.company_id,
          start_date: event.start_date,
          end_date: event.end_date,
          paperless_custom_field_value: event.paperless_custom_field_value || '',
        })
        setLocation({
          city: event.city ?? null,
          country: event.country ?? null,
          country_code: event.country_code ?? null,
          latitude: event.latitude ?? null,
          longitude: event.longitude ?? null,
        })
        setCoverImage(
          event.cover_image_url
            ? {
                image_url: event.cover_image_url,
                thumbnail_url: event.cover_thumbnail_url,
                photographer_name: event.cover_photographer_name,
                photographer_url: event.cover_photographer_url,
              }
            : null,
        )
      } else {
        reset({
          name: '',
          description: '',
          company_id: '',
          start_date: '',
          end_date: '',
          paperless_custom_field_value: '',
        })
        setLocation({
          city: null,
          country: null,
          country_code: null,
          latitude: null,
          longitude: null,
        })
        setCoverImage(null)
      }
      setError(null)
      setIsCreatingNewCustomField(false)
      setNewCustomFieldValue('')
    }
  }, [isOpen, event, reset])

  const handleClose = () => {
    onClose()
  }

  const onSubmit = async (data: EventFormData) => {
    setIsSaving(true)
    setError(null)

    try {
      const customFieldValue = isCreatingNewCustomField
        ? newCustomFieldValue
        : data.paperless_custom_field_value

      // Reset position to center (50) when cover image changes
      const imageChanged = coverImage?.image_url !== event?.cover_image_url
      const payload = {
        ...data,
        description: data.description || null,
        paperless_custom_field_value: customFieldValue || null,
        ...location,
        cover_image_url: coverImage?.image_url || null,
        cover_thumbnail_url: coverImage?.thumbnail_url || null,
        cover_photographer_name: coverImage?.photographer_name || null,
        cover_photographer_url: coverImage?.photographer_url || null,
        ...(imageChanged && coverImage ? { cover_image_position_y: 50 } : {}),
      }

      if (isEditMode && event) {
        await api.put(`/events/${event.id}`, payload)
        onSuccess()
      } else {
        const newEvent = await api.post<Event>('/events', payload)
        onSuccess(newEvent)
      }

      handleClose()
    } catch (e) {
      setError(
        e instanceof Error ? e.message : `Failed to ${isEditMode ? 'update' : 'create'} event`,
      )
    } finally {
      setIsSaving(false)
    }
  }

  const companyOptions = [
    { value: '', label: 'Select a company...' },
    ...companies.map((c) => ({ value: c.id, label: c.name })),
  ]

  const customFieldOptions = customFieldChoices?.available
    ? [
        { value: '', label: `Select ${customFieldChoices.custom_field_name}...` },
        ...customFieldChoices.choices.map((c) => ({ value: c.value, label: c.label })),
        { value: '__new__', label: '+ Add new...' },
      ]
    : []

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Edit Event' : 'Create New Event'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}

        <Input label="Event Name" {...register('name')} error={errors.name?.message} />

        <Input
          label="Description"
          {...register('description')}
          error={errors.description?.message}
        />

        <Select
          label="Company"
          options={companyOptions}
          {...register('company_id')}
          error={errors.company_id?.message}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            {...register('start_date')}
            error={errors.start_date?.message}
          />
          <Input
            label="End Date"
            type="date"
            {...register('end_date')}
            error={errors.end_date?.message}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <LocationAutocomplete
            value={location}
            onChange={setLocation}
            placeholder="Search for a city..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cover Image</label>
          <UnsplashImagePicker
            value={coverImage}
            onChange={setCoverImage}
            defaultSearchQuery={location.city || location.country || ''}
          />
        </div>

        {customFieldChoices?.available && (
          <div>
            <Select
              label={`Paperless ${customFieldChoices.custom_field_name}`}
              options={customFieldOptions}
              {...register('paperless_custom_field_value', {
                onChange: (e) => {
                  if (e.target.value === '__new__') {
                    setIsCreatingNewCustomField(true)
                  } else {
                    setIsCreatingNewCustomField(false)
                    setNewCustomFieldValue('')
                  }
                },
              })}
              error={errors.paperless_custom_field_value?.message}
            />
            {isCreatingNewCustomField && (
              <Input
                label={`New ${customFieldChoices.custom_field_name}`}
                value={newCustomFieldValue}
                onChange={(e) => setNewCustomFieldValue(e.target.value)}
                placeholder={`Enter new ${customFieldChoices.custom_field_name.toLowerCase()} name`}
                className="mt-2"
              />
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSaving}>
            {isEditMode ? 'Save Changes' : 'Create Event'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
