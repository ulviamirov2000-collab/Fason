'use client'

import { useState, useEffect, useRef } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────

const COMMON_BRANDS = [
  'Zara', 'H&M', 'Nike', 'Adidas', 'Mango',
  'Pull&Bear', 'Bershka', 'Reserved', 'LC Waikiki', 'Koton',
]

export const COLORS: { name: string; hex: string }[] = [
  { name: 'Ağ',        hex: '#FFFFFF' },
  { name: 'Qara',      hex: '#1C1C1C' },
  { name: 'Boz',       hex: '#9E9E9E' },
  { name: 'Bej',       hex: '#D4B896' },
  { name: 'Qəhvəyi',   hex: '#795548' },
  { name: 'Qırmızı',   hex: '#F44336' },
  { name: 'Narıncı',   hex: '#FF9800' },
  { name: 'Sarı',      hex: '#FFE600' },
  { name: 'Yaşıl',     hex: '#4CAF50' },
  { name: 'Mavi',      hex: '#2196F3' },
  { name: 'Göy',       hex: '#00BCD4' },
  { name: 'Bənövşəyi', hex: '#9C27B0' },
  { name: 'Çəhrayı',   hex: '#FF2D78' },
  { name: 'Qızılı',    hex: '#FFD700' },
  { name: 'Gümüşü',    hex: '#C0C0C0' },
  { name: 'Çoxrəngli', hex: 'multi' },
]

const CONDITIONS = ['Hamısı', 'Yeni', 'Yaxşı', 'Orta']

const SORT_OPTIONS = [
  { key: 'newest',     label: 'Ən son' },
  { key: 'price_asc',  label: 'Ucuzdan bahaya' },
  { key: 'price_desc', label: 'Bahadan ucuza' },
  { key: 'views',      label: 'Ən çox baxılan' },
]

// All sizes shown when no category is selected
const ALL_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL',
  '34', '36', '38', '40', '42', '44',
  '35', '37', '39', '41', '43', '45',
  'Universal',
]

// ── Shared dropdown trigger button ────────────────────────────────────────────

type BtnProps = {
  label: string
  badge?: number
  isActive: boolean
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  alignRight?: boolean
}

function FilterBtn({ label, badge, isActive, open, onToggle, children, alignRight }: BtnProps) {
  const display = badge ? `${label} · ${badge}` : label

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={onToggle}
        className="flex items-center gap-1 px-3.5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap select-none"
        style={{
          border:          `1.5px solid ${isActive ? '#FF2D78' : '#d1d5db'}`,
          color:           isActive ? '#FF2D78' : '#1a1040',
          backgroundColor: isActive ? '#fff0f5' : 'white',
        }}
      >
        <span>{display}</span>
        <svg
          className="w-3.5 h-3.5 transition-transform duration-150"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)' }}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="dropdown-fade absolute top-full mt-2 z-50 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: 'white',
            border:          '1.5px solid #e5e7eb',
            boxShadow:       '0 8px 32px rgba(0,0,0,0.13)',
            minWidth:        '220px',
            maxWidth:        'calc(100vw - 2rem)',
            ...(alignRight ? { right: 0 } : { left: 0 }),
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

// ── Footer shared by each dropdown ────────────────────────────────────────────

function DropdownFooter({
  onReset,
  onApply,
  applyLabel = 'Tətbiq et',
}: {
  onReset: () => void
  onApply?: () => void
  applyLabel?: string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <button
        onClick={onReset}
        className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
      >
        Sıfırla
      </button>
      {onApply && (
        <button
          onClick={onApply}
          className="text-xs font-bold px-3.5 py-1.5 rounded-full text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#FF2D78' }}
        >
          {applyLabel}
        </button>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

export type FilterBarProps = {
  availableSizes: string[]
  brand:     string
  priceMin:  string
  priceMax:  string
  sizes:     string[]
  colors:    string[]
  condition: number
  sort:      string
  onBrandChange:     (b: string)            => void
  onPriceChange:     (min: string, max: string) => void
  onSizesChange:     (s: string[])          => void
  onColorsChange:    (c: string[])          => void
  onConditionChange: (n: number)            => void
  onSortChange:      (s: string)            => void
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FilterBar({
  availableSizes,
  brand, priceMin, priceMax, sizes, colors, condition, sort,
  onBrandChange, onPriceChange, onSizesChange, onColorsChange,
  onConditionChange, onSortChange,
}: FilterBarProps) {

  const [open, setOpen]   = useState<string | null>(null)
  // Pending inputs (applied on "Tətbiq et")
  const [brandDraft, setBrandDraft]       = useState(brand)
  const [minDraft, setMinDraft]           = useState(priceMin)
  const [maxDraft, setMaxDraft]           = useState(priceMax)
  const barRef = useRef<HTMLDivElement>(null)

  // Sync drafts when external state clears
  useEffect(() => { setBrandDraft(brand) },    [brand])
  useEffect(() => { setMinDraft(priceMin) },   [priceMin])
  useEffect(() => { setMaxDraft(priceMax) },   [priceMax])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpen(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function tog(key: string) { setOpen(p => (p === key ? null : key)) }

  function toggleSize(s: string) {
    onSizesChange(sizes.includes(s) ? sizes.filter(x => x !== s) : [...sizes, s])
  }

  function toggleColor(c: string) {
    onColorsChange(colors.includes(c) ? colors.filter(x => x !== c) : [...colors, c])
  }

  const displaySizes = availableSizes.length ? availableSizes : ALL_SIZES

  // Active states
  const brandActive     = !!brand
  const priceActive     = !!(priceMin || priceMax)
  const sizesActive     = sizes.length > 0
  const colorsActive    = colors.length > 0
  const conditionActive = condition > 0
  const sortActive      = sort !== 'newest'

  return (
    <div
      ref={barRef}
      className="w-full px-4 py-2.5 border-b-2"
      style={{ backgroundColor: '#FAF7F2', borderColor: '#1a1040' }}
    >
      <style>{`
        @keyframes dropFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dropdown-fade { animation: dropFadeIn 150ms ease forwards; }
      `}</style>

      <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">

        {/* ── BREND ─────────────────────────────────────────────────────── */}
        <FilterBtn
          label="Brend" isActive={brandActive}
          open={open === 'brand'} onToggle={() => tog('brand')}
        >
          <div className="p-4">
            <input
              type="text"
              value={brandDraft}
              onChange={e => setBrandDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onBrandChange(brandDraft.trim()); setOpen(null) }
              }}
              placeholder="Brend axtar..."
              autoFocus
              className="w-full px-3 py-2 rounded-xl text-sm outline-none"
              style={{ border: '1.5px solid #e5e7eb' }}
            />
            <div className="flex flex-wrap gap-1.5 mt-3">
              {COMMON_BRANDS.map(b => (
                <button
                  key={b}
                  onClick={() => { onBrandChange(b); setBrandDraft(b); setOpen(null) }}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={
                    brand === b
                      ? { backgroundColor: '#FF2D78', color: 'white', border: '1.5px solid #FF2D78' }
                      : { backgroundColor: 'white', color: '#1a1040', border: '1.5px solid #e5e7eb' }
                  }
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
          <DropdownFooter
            onReset={() => { onBrandChange(''); setBrandDraft('') }}
            onApply={() => { onBrandChange(brandDraft.trim()); setOpen(null) }}
          />
        </FilterBtn>

        {/* ── QİYMƏT ────────────────────────────────────────────────────── */}
        <FilterBtn
          label="Qiymət" isActive={priceActive}
          open={open === 'price'} onToggle={() => tog('price')}
        >
          <div className="p-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={0}
                  value={minDraft}
                  onChange={e => setMinDraft(e.target.value)}
                  placeholder="Min"
                  className="w-full px-3 py-2 pr-11 rounded-xl text-sm outline-none"
                  style={{ border: '1.5px solid #e5e7eb' }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                  AZN
                </span>
              </div>
              <span className="text-gray-400 text-sm flex-shrink-0">—</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  min={0}
                  value={maxDraft}
                  onChange={e => setMaxDraft(e.target.value)}
                  placeholder="Max"
                  className="w-full px-3 py-2 pr-11 rounded-xl text-sm outline-none"
                  style={{ border: '1.5px solid #e5e7eb' }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                  AZN
                </span>
              </div>
            </div>
          </div>
          <DropdownFooter
            onReset={() => { onPriceChange('', ''); setMinDraft(''); setMaxDraft('') }}
            onApply={() => { onPriceChange(minDraft, maxDraft); setOpen(null) }}
          />
        </FilterBtn>

        {/* ── ÖLÇÜ ──────────────────────────────────────────────────────── */}
        <FilterBtn
          label="Ölçü" isActive={sizesActive} badge={sizes.length || undefined}
          open={open === 'size'} onToggle={() => tog('size')}
        >
          <div className="p-4" style={{ maxWidth: '320px' }}>
            <div className="flex flex-wrap gap-1.5">
              {displaySizes.map(s => (
                <button
                  key={s}
                  onClick={() => toggleSize(s)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={
                    sizes.includes(s)
                      ? { backgroundColor: '#FFE600', color: '#1a1040', border: '1.5px solid #1a1040' }
                      : { backgroundColor: 'white', color: '#1a1040', border: '1.5px solid #e5e7eb' }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <DropdownFooter
            onReset={() => onSizesChange([])}
            onApply={() => setOpen(null)}
          />
        </FilterBtn>

        {/* ── RƏNG ──────────────────────────────────────────────────────── */}
        <FilterBtn
          label="Rəng" isActive={colorsActive} badge={colors.length || undefined}
          open={open === 'color'} onToggle={() => tog('color')}
        >
          <div className="p-4" style={{ maxWidth: '300px' }}>
            <div className="flex flex-wrap gap-3">
              {COLORS.map(c => {
                const sel = colors.includes(c.name)
                const bg =
                  c.hex === 'multi'
                    ? 'conic-gradient(#FF2D78, #FFE600, #00E5CC, #2196F3, #9C27B0, #FF2D78)'
                    : c.hex
                return (
                  <button
                    key={c.name}
                    onClick={() => toggleColor(c.name)}
                    className="flex flex-col items-center gap-1 group"
                    title={c.name}
                  >
                    <div
                      className="w-8 h-8 rounded-full transition-all duration-150"
                      style={{
                        background: bg,
                        border: sel
                          ? '2.5px solid #FF2D78'
                          : c.hex === '#FFFFFF'
                          ? '1.5px solid #d1d5db'
                          : '1.5px solid transparent',
                        boxShadow: sel ? '0 0 0 2px rgba(255,45,120,0.25)' : 'none',
                        transform: sel ? 'scale(1.12)' : 'scale(1)',
                      }}
                    />
                    <span className="text-[9px] text-gray-500 leading-none max-w-[36px] text-center truncate">
                      {c.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <DropdownFooter
            onReset={() => onColorsChange([])}
            onApply={() => setOpen(null)}
          />
        </FilterBtn>

        {/* ── VƏZİYYƏT ──────────────────────────────────────────────────── */}
        <FilterBtn
          label="Vəziyyət" isActive={conditionActive}
          open={open === 'condition'} onToggle={() => tog('condition')}
        >
          <div className="py-2" style={{ minWidth: '180px' }}>
            {CONDITIONS.map((cond, i) => (
              <button
                key={cond}
                onClick={() => { onConditionChange(i); setOpen(null) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 text-sm"
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                  style={
                    condition === i
                      ? { borderColor: '#FF2D78', backgroundColor: '#FF2D78' }
                      : { borderColor: '#d1d5db' }
                  }
                >
                  {condition === i && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <span
                  className="transition-colors"
                  style={{ color: condition === i ? '#FF2D78' : '#1a1040', fontWeight: condition === i ? 600 : 400 }}
                >
                  {cond}
                </span>
              </button>
            ))}
          </div>
          <DropdownFooter onReset={() => { onConditionChange(0); setOpen(null) }} />
        </FilterBtn>

        {/* ── SIRALA ────────────────────────────────────────────────────── */}
        <FilterBtn
          label="Sırala" isActive={sortActive}
          open={open === 'sort'} onToggle={() => tog('sort')}
          alignRight
        >
          <div className="py-2" style={{ minWidth: '200px' }}>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => { onSortChange(opt.key); setOpen(null) }}
                className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 text-sm"
              >
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                  style={
                    sort === opt.key
                      ? { borderColor: '#FF2D78', backgroundColor: '#FF2D78' }
                      : { borderColor: '#d1d5db' }
                  }
                >
                  {sort === opt.key && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <span
                  className="transition-colors"
                  style={{ color: sort === opt.key ? '#FF2D78' : '#1a1040', fontWeight: sort === opt.key ? 600 : 400 }}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          <DropdownFooter onReset={() => { onSortChange('newest'); setOpen(null) }} />
        </FilterBtn>

      </div>
    </div>
  )
}
