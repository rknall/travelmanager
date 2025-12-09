// SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
// SPDX-License-Identifier: GPL-2.0-only
import { cn } from '@/lib/utils'
import type { ContactType } from '@/types'
import { CONTACT_TYPE_LABELS } from '@/types'

const typeColors: Record<ContactType, string> = {
  billing: 'bg-green-100 text-green-800',
  hr: 'bg-purple-100 text-purple-800',
  technical: 'bg-blue-100 text-blue-800',
  support: 'bg-yellow-100 text-yellow-800',
  office: 'bg-gray-100 text-gray-800',
  sales: 'bg-orange-100 text-orange-800',
  management: 'bg-red-100 text-red-800',
  other: 'bg-slate-100 text-slate-800',
}

interface ContactTypeBadgeProps {
  type: ContactType
  size?: 'sm' | 'md'
  className?: string
}

export function ContactTypeBadge({ type, size = 'md', className }: ContactTypeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-sm',
        typeColors[type] || typeColors.other,
        className
      )}
    >
      {CONTACT_TYPE_LABELS[type] || type}
    </span>
  )
}
