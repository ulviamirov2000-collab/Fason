'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// ── Constants ─────────────────────────────────────────────────────────────────

const COMMON_BRANDS = [
  'Zara', 'H&M', 'Nike', 'Adidas', 'Mango', 'Pull&Bear', 'Bershka', 'Reserved', 'LC Waikiki', 'Koton',
  'Marks&Spencer', 'DeFacto', 'Lacoste', 'Tommy Hilfiger', 'Guess', 'Calvin Klein', "Levi's", 'New Balance', 'Puma', 'Reebok',
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
  { name: 'Çoxrəngli', hex: 'multi'   },
]

const CONDITIONS = ['Hamısı', 'Yeni', 'Yaxşı', 'Orta']

const SORT_OPTIONS = [
  { key: 'newest',     label: 'Ən son' },
  { key: 'price_asc',  label: 'Ucuzdan bahaya' },
  { key: 'price_desc', label: 'Bahadan ucuza' },
  { key: 'views',      label: 'Ən çox baxılan' },
]

const ALL_SIZES = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL',
  '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
  'Universal',
]

// ── Trigger button (button only — no inline dropdown) ─────────────────────────

type BtnProps = {
  label:    string
  badge?:   number
  isActive: boolean
  open:     boolean
  onToggle: () => void
  btnRef:   React.RefObject<HTMLButtonElement | null>
}

function FilterBtn({ label, badge, isActive, open, onToggle, btnRef }: BtnProps) {
  const display = badge ? `${label} · ${badge}` : label
  return (
    <button
      ref={btnRef}
      onClick={onToggle}
      className="flex-shrink-0 flex items-center gap-1 px-3.5 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap select-none"
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
  )
}

// ── Dropdown footer ───────────────────────────────────────────────────────────

function DropdownFooter({
  onReset, onApply,
}: { onReset: () => void; onApply?: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <button onClick={onReset} className="text-xs text-gray-400 hover:text-gray-700 transition-colors">
        Sıfırla
      </button>
      {onApply && (
        <button
          onClick={onApply}
          className="text-xs font-bold px-3.5 py-1.5 rounded-full text-white hover:opacity-90"
          style={{ backgroundColor: '#FF2D78' }}
        >
          Tətbiq et
        </button>
      )}
    </div>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────

export type FilterBarProps = {
  availableSizes:    string[]
  brand:     string
  priceMin:  string
  priceMax:  string
  sizes:     string[]
  colors:    string[]
  condition: number
  sort:      string
  onBrandChange:     (b: string)               => void
  onPriceChange:     (min: string, max: string) => void
  onSizesChange:     (s: string[])             => void
  onColorsChange:    (c: string[])             => void
  onConditionChange: (n: number)               => void
  onSortChange:      (s: string)               => void
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FilterBar({
  availableSizes,
  brand, priceMin, priceMax, sizes, colors, condition, sort,
  onBrandChange, onPriceChange, onSizesChange, onColorsChange,
  onConditionChange, onSortChange,
}: FilterBarProps) {

  const [open, setOpen]     = useState<string | null>(null)
  const [dropPos, setDropPos] = useState<{ top: number; left: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  // Pending inputs — applied only on "Tətbiq et"
  const [brandDraft, setBrandDraft] = useState(brand)
  const [minDraft,   setMinDraft]   = useState(priceMin)
  const [maxDraft,   setMaxDraft]   = useState(priceMax)

  // One ref per button for position calculation
  const brandRef = useRef<HTMLButtonElement>(null)
  const priceRef = useRef<HTMLButtonElement>(null)
  const sizeRef  = useRef<HTMLButtonElement>(null)
  const colorRef = useRef<HTMLButtonElement>(null)
  const condRef  = useRef<HTMLButtonElement>(null)
  const sortRef  = useRef<HTMLButtonElement>(null)

  const refMap: Record<string, React.RefObject<HTMLButtonElement | null>> = {
    brand: brandRef, price: priceRef, size: sizeRef,
    color: colorRef, condition: condRef, sort: sortRef,
  }

  // Portal requires client-side mount
  useEffect(() => { setMounted(true) }, [])

  // Sync drafts when props reset externally
  useEffect(() => { setBrandDraft(brand) },    [brand])
  useEffect(() => { setMinDraft(priceMin) },   [priceMin])
  useEffect(() => { setMaxDraft(priceMax) },   [priceMax])

  // Close when page scrolls or resizes (dropdown would float away from button)
  useEffect(() => {
    if (!open) return
    function dismiss() { setOpen(null); setDropPos(null) }
    window.addEventListener('scroll', dismiss, { passive: true, capture: true })
    window.addEventListener('resize', dismiss)
    return () => {
      window.removeEventListener('scroll', dismiss, { capture: true })
      window.removeEventListener('resize', dismiss)
    }
  }, [open])

  // Close on outside click (mousedown so it fires before the blur events)
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      const panel = document.getElementById('filterbar-dropdown-panel')
      const btn   = open ? refMap[open]?.current : null
      if (
        panel && !panel.contains(e.target as Node) &&
        btn   && !btn.contains(e.target as Node)
      ) {
        setOpen(null)
        setDropPos(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function tog(key: string) {
    if (open === key) { setOpen(null); setDropPos(null); return }

    const btn = refMap[key]?.current
    if (btn) {
      const rect = btn.getBoundingClientRect()
      // Keep panel inside viewport horizontally
      const panelWidth = key === 'color' ? 300 : key === 'size' ? 320 : key === 'brand' ? 320 : 220
      let left = rect.left
      if (left + panelWidth > window.innerWidth - 8) {
        left = window.innerWidth - panelWidth - 8
      }
      left = Math.max(8, left)
      setDropPos({ top: rect.bottom + 6, left })
    }
    setOpen(key)
  }

  function toggleSize(s: string) {
    onSizesChange(sizes.includes(s) ? sizes.filter(x => x !== s) : [...sizes, s])
  }
  function toggleColor(c: string) {
    onColorsChange(colors.includes(c) ? colors.filter(x => x !== c) : [...colors, c])
  }

  const displaySizes = availableSizes.length ? availableSizes : ALL_SIZES

  const brandActive     = !!brand
  const priceActive     = !!(priceMin || priceMax)
  const sizesActive     = sizes.length > 0
  const colorsActive    = colors.length > 0
  const conditionActive = condition > 0
  const sortActive      = sort !== 'newest'

  // ── Dropdown panel content ────────────────────────────────────────────────

  function renderPanel() {
    if (!open) return null

    switch (open) {
      case 'brand':
        return (
          <>
            <div className="p-4">
              <input
                type="text"
                value={brandDraft}
                onChange={e => setBrandDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { onBrandChange(brandDraft.trim()); setOpen(null) } }}
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
          </>
        )

      case 'price':
        return (
          <>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="number" min={0} value={minDraft}
                    onChange={e => setMinDraft(e.target.value)}
                    placeholder="Min"
                    className="w-full px-3 py-2 pr-11 rounded-xl text-sm outline-none"
                    style={{ border: '1.5px solid #e5e7eb' }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">AZN</span>
                </div>
                <span className="text-gray-400 text-sm flex-shrink-0">—</span>
                <div className="relative flex-1">
                  <input
                    type="number" min={0} value={maxDraft}
                    onChange={e => setMaxDraft(e.target.value)}
                    placeholder="Max"
                    className="w-full px-3 py-2 pr-11 rounded-xl text-sm outline-none"
                    style={{ border: '1.5px solid #e5e7eb' }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">AZN</span>
                </div>
              </div>
            </div>
            <DropdownFooter
              onReset={() => { onPriceChange('', ''); setMinDraft(''); setMaxDraft('') }}
              onApply={() => { onPriceChange(minDraft, maxDraft); setOpen(null) }}
            />
          </>
        )

      case 'size':
        return (
          <>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {displaySizes.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSize(s)}
                    className="text-xs font-semibold rounded-xl transition-all"
                    style={{
                      minWidth: '42px',
                      minHeight: '40px',
                      padding: '6px 10px',
                      ...(sizes.includes(s)
                        ? { backgroundColor: '#FFE600', color: '#1a1040', border: '1.5px solid #1a1040' }
                        : { backgroundColor: 'white', color: '#1a1040', border: '1.5px solid #e5e7eb' }),
                    }}
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
          </>
        )

      case 'color':
        return (
          <>
            <div className="p-4">
              <div className="flex flex-wrap gap-3">
                {COLORS.map(c => {
                  const sel = colors.includes(c.name)
                  const bg = c.hex === 'multi'
                    ? 'conic-gradient(#FF2D78, #FFE600, #00E5CC, #2196F3, #9C27B0, #FF2D78)'
                    : c.hex
                  return (
                    <button
                      key={c.name}
                      onClick={() => toggleColor(c.name)}
                      className="flex flex-col items-center gap-1"
                      title={c.name}
                      style={{ minWidth: '40px', minHeight: '52px' }}
                    >
                      <div
                        className="w-8 h-8 rounded-full transition-all duration-150"
                        style={{
                          background: bg,
                          border: sel
                            ? '2.5px solid #FF2D78'
                            : c.hex === '#FFFFFF' ? '1.5px solid #d1d5db' : '1.5px solid transparent',
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
          </>
        )

      case 'condition':
        return (
          <>
            <div className="py-2">
              {CONDITIONS.map((cond, i) => (
                <button
                  key={cond}
                  onClick={() => { onConditionChange(i); setOpen(null) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 text-sm"
                  style={{ minHeight: '44px' }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={condition === i ? { borderColor: '#FF2D78', backgroundColor: '#FF2D78' } : { borderColor: '#d1d5db' }}
                  >
                    {condition === i && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span style={{ color: condition === i ? '#FF2D78' : '#1a1040', fontWeight: condition === i ? 600 : 400 }}>
                    {cond}
                  </span>
                </button>
              ))}
            </div>
            <DropdownFooter onReset={() => { onConditionChange(0); setOpen(null) }} />
          </>
        )

      case 'sort':
        return (
          <>
            <div className="py-2">
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { onSortChange(opt.key); setOpen(null) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50 text-sm"
                  style={{ minHeight: '44px' }}
                >
                  <div
                    className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                    style={sort === opt.key ? { borderColor: '#FF2D78', backgroundColor: '#FF2D78' } : { borderColor: '#d1d5db' }}
                  >
                    {sort === opt.key && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <span style={{ color: sort === opt.key ? '#FF2D78' : '#1a1040', fontWeight: sort === opt.key ? 600 : 400 }}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
            <DropdownFooter onReset={() => { onSortChange('newest'); setOpen(null) }} />
          </>
        )

      default: return null
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const panelContent = renderPanel()
  const panelWidths: Record<string, number> = {
    brand: 320, price: 280, size: 320, color: 300, condition: 200, sort: 220,
  }

  return (
    <>
      <style>{`
        @keyframes dropFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .drop-panel { animation: dropFadeIn 150ms ease forwards; }
      `}</style>

      {/* ── Filter bar row ── */}
      <div
        className="w-full px-4 py-2.5 border-b-2"
        style={{ backgroundColor: '#FAF7F2', borderColor: '#1a1040' }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
          <FilterBtn label="Brend"    isActive={brandActive}     open={open === 'brand'}     onToggle={() => tog('brand')}     btnRef={brandRef} />
          <FilterBtn label="Qiymət"   isActive={priceActive}     open={open === 'price'}     onToggle={() => tog('price')}     btnRef={priceRef} />
          <FilterBtn label="Ölçü"     isActive={sizesActive}     open={open === 'size'}      onToggle={() => tog('size')}      btnRef={sizeRef}  badge={sizes.length || undefined} />
          <FilterBtn label="Rəng"     isActive={colorsActive}    open={open === 'color'}     onToggle={() => tog('color')}     btnRef={colorRef} badge={colors.length || undefined} />
          <FilterBtn label="Vəziyyət" isActive={conditionActive} open={open === 'condition'} onToggle={() => tog('condition')} btnRef={condRef}  />
          <FilterBtn label="Sırala"   isActive={sortActive}      open={open === 'sort'}      onToggle={() => tog('sort')}      btnRef={sortRef}  />
        </div>
      </div>

      {/* ── Dropdown portal — rendered into document.body, bypasses overflow clipping ── */}
      {mounted && open && dropPos && panelContent &&
        createPortal(
          <div
            id="filterbar-dropdown-panel"
            className="drop-panel"
            style={{
              position:        'fixed',
              top:             dropPos.top,
              left:            dropPos.left,
              zIndex:          9999,
              width:           panelWidths[open] ?? 220,
              backgroundColor: 'white',
              border:          '1.5px solid #e5e7eb',
              borderRadius:    '16px',
              boxShadow:       '0 8px 40px rgba(0,0,0,0.15)',
              overflowY:       'auto',
              maxHeight:       'calc(100vh - 120px)',
            }}
          >
            {panelContent}
          </div>,
          document.body
        )
      }
    </>
  )
}
