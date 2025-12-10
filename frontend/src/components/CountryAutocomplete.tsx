// SPDX-FileCopyrightText: 2025 Roland Knall <rknall@gmail.com>
// SPDX-License-Identifier: GPL-2.0-only
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

// Common countries list
const COUNTRIES = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahrain',
  'Bangladesh',
  'Belarus',
  'Belgium',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Brazil',
  'Bulgaria',
  'Cambodia',
  'Canada',
  'Chile',
  'China',
  'Colombia',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Estonia',
  'Ethiopia',
  'Finland',
  'France',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Guatemala',
  'Honduras',
  'Hong Kong',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kuwait',
  'Latvia',
  'Lebanon',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Malaysia',
  'Malta',
  'Mexico',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Nigeria',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Panama',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Saudi Arabia',
  'Serbia',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'South Africa',
  'South Korea',
  'Spain',
  'Sri Lanka',
  'Sweden',
  'Switzerland',
  'Taiwan',
  'Thailand',
  'Tunisia',
  'Turkey',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Venezuela',
  'Vietnam',
]

interface CountryAutocompleteProps {
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
  className?: string
}

export function CountryAutocomplete({
  value,
  onChange,
  label,
  error,
  className,
}: CountryAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        // If we have a partial match, clear it
        if (!COUNTRIES.includes(inputValue)) {
          setInputValue(value)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [inputValue, value])

  const filteredCountries = COUNTRIES.filter((country) =>
    country.toLowerCase().includes(inputValue.toLowerCase()),
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setIsOpen(true)
    // If exact match, select it
    const exactMatch = COUNTRIES.find((c) => c.toLowerCase() === e.target.value.toLowerCase())
    if (exactMatch) {
      onChange(exactMatch)
    }
  }

  const handleSelect = (country: string) => {
    setInputValue(country)
    onChange(country)
    setIsOpen(false)
  }

  const handleFocus = () => {
    setIsOpen(true)
  }

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      {label && <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder="Start typing to search..."
        aria-label={label || 'Country'}
        className={cn(
          'w-full px-3 py-2 border rounded-md shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          error ? 'border-red-300' : 'border-gray-300',
        )}
      />

      {isOpen && filteredCountries.length > 0 && (
        <div
          className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {filteredCountries.slice(0, 10).map((country) => (
            <div
              key={country}
              role="option"
              aria-selected={country === value}
              onClick={() => handleSelect(country)}
              onKeyDown={(e) => e.key === 'Enter' && handleSelect(country)}
              tabIndex={0}
              className={cn(
                'px-3 py-2 cursor-pointer hover:bg-gray-50',
                country === value && 'bg-blue-50 text-blue-700',
              )}
            >
              {country}
            </div>
          ))}
          {filteredCountries.length > 10 && (
            <div className="px-3 py-2 text-gray-400 text-sm">
              {filteredCountries.length - 10} more countries...
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}
