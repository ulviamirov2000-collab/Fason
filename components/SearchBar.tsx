'use client'

import { useState, useEffect, useRef } from 'react'
import { SUBCATEGORIES } from '@/lib/sizes'

type Option = { sub: string; cat: string }

const ALL_OPTIONS: Option[] = Object.entries(SUBCATEGORIES).flatMap(([cat, subs]) =>
  subs.map((sub) => ({ sub, cat }))
)

type Props = {
  selectedSubcategory: string | null
  onSelect: (sub: string, cat: string) => void
  onClear: () => void
}

export default function SearchBar({ selectedSubcategory, onSelect, onClear }: Props) {
  const [inputValue, setInputValue] = useState(selectedSubcategory ?? '')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync input display with external changes (e.g. FilterBar clearing subcategory)
  useEffect(() => {
    setInputValue(selectedSubcategory ?? '')
  }, [selectedSubcategory])

  const filteredOptions = inputValue && !selectedSubcategory
    ? ALL_OPTIONS.filter(({ sub, cat }) =>
        sub.toLowerCase().includes(inputValue.toLowerCase()) ||
        cat.toLowerCase().includes(inputValue.toLowerCase())
      )
    : ALL_OPTIONS

  function handleInputChange(val: string) {
    setInputValue(val)
    // If user edits after selecting, clear the selection first
    if (selectedSubcategory) onClear()
    setIsOpen(true)
  }

  function handleSelect(option: Option) {
    onSelect(option.sub, option.cat)
    setIsOpen(false)
  }

  function handleClear() {
    setInputValue('')
    onClear()
    setIsOpen(false)
    inputRef.current?.focus()
  }

  const hasValue = !!(inputValue || selectedSubcategory)

  return (
    <div className="relative w-full">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-2xl transition-all"
        style={{
          border: `2px solid ${isOpen || selectedSubcategory ? '#FF2D78' : '#1a1040'}`,
          backgroundColor: 'white',
          boxShadow: isOpen ? '3px 3px 0 #1a1040' : 'none',
        }}
      >
        {/* Search icon */}
        <svg
          className="w-5 h-5 flex-shrink-0"
          style={{ color: selectedSubcategory ? '#FF2D78' : '#999' }}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
          placeholder="Məhsul axtar... (məs. Köynək, Cins şalvar)"
          className="flex-1 text-sm outline-none bg-transparent"
          style={{ color: '#1a1040' }}
        />

        {/* Selected badge or clear */}
        {hasValue && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors hover:bg-gray-100"
            style={{ color: '#999' }}
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-1 rounded-2xl overflow-hidden overflow-y-auto"
          style={{
            border: '2px solid #1a1040',
            backgroundColor: 'white',
            maxHeight: '320px',
            boxShadow: '4px 4px 0 #1a1040',
          }}
        >
          {filteredOptions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">Nəticə tapılmadı</div>
          ) : (
            filteredOptions.map(({ sub, cat }) => (
              <button
                key={`${cat}::${sub}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect({ sub, cat })}
                className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-pink-50 border-b border-gray-50 last:border-b-0"
                style={
                  selectedSubcategory === sub
                    ? { backgroundColor: '#FFF0F5' }
                    : {}
                }
              >
                <span
                  className="text-sm font-medium"
                  style={{ color: selectedSubcategory === sub ? '#FF2D78' : '#1a1040' }}
                >
                  {sub}
                </span>
                <span className="text-xs text-gray-400 ml-3 flex-shrink-0">{cat}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
