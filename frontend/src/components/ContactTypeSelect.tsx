// SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
// SPDX-License-Identifier: GPL-2.0-only
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { ContactType } from '@/types'
import { CONTACT_TYPE_LABELS } from '@/types'
import { ContactTypeBadge } from './ContactTypeBadge'

const ALL_CONTACT_TYPES: ContactType[] = [
  'billing',
  'hr',
  'technical',
  'support',
  'office',
  'sales',
  'management',
  'other',
]

interface ContactTypeSelectProps {
  value: ContactType[]
  onChange: (types: ContactType[]) => void
  label?: string
  error?: string
  className?: string
}

export function ContactTypeSelect({
  value = [],
  onChange,
  label,
  error,
  className,
}: ContactTypeSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Ensure value is always an array
  const safeValue = value ?? []

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleType = (type: ContactType) => {
    if (safeValue.includes(type)) {
      onChange(safeValue.filter((t) => t !== type))
    } else {
      onChange([...safeValue, type])
    }
  }

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full min-h-[42px] px-3 py-2 text-left bg-white border rounded-md shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error ? 'border-red-300' : 'border-gray-300'
        )}
      >
        {safeValue.length === 0 ? (
          <span className="text-gray-400">Select contact types...</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {safeValue.map((type) => (
              <ContactTypeBadge key={type} type={type} size="sm" />
            ))}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {ALL_CONTACT_TYPES.map((type) => (
            <div
              key={type}
              onClick={() => toggleType(type)}
              className={cn(
                'px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50',
                safeValue.includes(type) && 'bg-blue-50'
              )}
            >
              <span>{CONTACT_TYPE_LABELS[type]}</span>
              {safeValue.includes(type) && (
                <svg
                  className="h-4 w-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
