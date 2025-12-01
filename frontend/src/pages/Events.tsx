// SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
// SPDX-License-Identifier: GPL-2.0-only
import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, Pencil, ChevronDown, MapPin } from 'lucide-react'
import { api } from '@/api/client'
import type { Company, Event, EventStatus, EventCustomFieldChoices as EventCustomFieldChoicesType } from '@/types'
import { EventFormModal } from '@/components/EventFormModal'
import { useLocale } from '@/stores/locale'
import { useBreadcrumb } from '@/stores/breadcrumb'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Spinner } from '@/components/ui/Spinner'
import { Alert } from '@/components/ui/Alert'

const statusColors: Record<EventStatus, 'default' | 'warning' | 'info'> = {
  planning: 'warning',
  active: 'info',
  past: 'default',
}

const statusLabels: Record<EventStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  past: 'Past',
}

const validTransitions: Record<EventStatus, EventStatus[]> = {
  planning: ['active'],
  active: ['past', 'planning'],
  past: ['active'],
}

export function Events() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { formatDate } = useLocale()
  const { setItems: setBreadcrumb } = useBreadcrumb()
  const [events, setEvents] = useState<Event[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [customFieldChoices, setCustomFieldChoices] = useState<EventCustomFieldChoicesType | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchData = async () => {
    try {
      const [eventsData, companiesData, choicesData] = await Promise.all([
        api.get<Event[]>('/events'),
        api.get<Company[]>('/companies'),
        api.get<EventCustomFieldChoicesType>('/integrations/event-custom-field-choices'),
      ])
      setEvents(eventsData)
      setCompanies(companiesData)
      setCustomFieldChoices(choicesData)
    } catch {
      setError('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setBreadcrumb([{ label: 'Events' }])
  }, [setBreadcrumb])

  useEffect(() => {
    fetchData()
  }, [])

  // Open modal if navigated with ?new=true
  useEffect(() => {
    if (searchParams.get('new') === 'true' && !isLoading) {
      setIsModalOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams, isLoading])

  const deleteEvent = async (e: React.MouseEvent, eventId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this event? This will also delete all associated expenses, contacts, notes, and todos.')) {
      return
    }
    try {
      await api.delete(`/events/${eventId}`)
      await fetchData()
    } catch {
      setError('Failed to delete event')
    }
  }

  const openEditModal = (e: React.MouseEvent, event: Event) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingEvent(event)
  }

  const updateEventStatus = async (e: React.MouseEvent, eventId: string, newStatus: EventStatus) => {
    e.preventDefault()
    e.stopPropagation()
    setStatusDropdownOpen(null)
    try {
      await api.put(`/events/${eventId}`, { status: newStatus })
      await fetchData()
    } catch {
      setError('Failed to update status')
    }
  }

  const toggleStatusDropdown = (e: React.MouseEvent, eventId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setStatusDropdownOpen(statusDropdownOpen === eventId ? null : eventId)
  }

  const handleEventCreated = (event?: Event) => {
    if (event) {
      navigate(`/events/${event.id}`)
    }
  }

  const handleEventUpdated = () => {
    fetchData()
    setEditingEvent(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : events.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No events yet. Create your first event to get started.
            </p>
          ) : (
            <div className="divide-y divide-gray-200">
              {events.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-6 px-6 transition-colors"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{event.name}</h3>
                    <p className="text-sm text-gray-500">
                      {event.company_name && (
                        <span className="text-gray-600">{event.company_name} &middot; </span>
                      )}
                      {formatDate(event.start_date)} to {formatDate(event.end_date)}
                      {(event.city || event.country) && (
                        <span className="ml-2 text-gray-600">
                          <MapPin className="inline h-3 w-3" /> {event.city ? `${event.city}, ${event.country}` : event.country}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative" ref={statusDropdownOpen === event.id ? dropdownRef : null}>
                      <button
                        onClick={(e) => toggleStatusDropdown(e, event.id)}
                        className="flex items-center gap-1"
                      >
                        <Badge variant={statusColors[event.status]}>
                          {statusLabels[event.status]}
                        </Badge>
                        <ChevronDown className="h-3 w-3 text-gray-400" />
                      </button>
                      {statusDropdownOpen === event.id && (
                        <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                          {validTransitions[event.status].map((status) => (
                            <button
                              key={status}
                              onClick={(e) => updateEventStatus(e, event.id, status)}
                              className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                            >
                              {statusLabels[status]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={(e) => openEditModal(e, event)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Edit event"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => deleteEvent(e, event.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete event"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Event Modal */}
      <EventFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleEventCreated}
        companies={companies}
        customFieldChoices={customFieldChoices}
      />

      {/* Edit Event Modal */}
      <EventFormModal
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        onSuccess={handleEventUpdated}
        event={editingEvent}
        companies={companies}
        customFieldChoices={customFieldChoices}
      />
    </div>
  )
}
