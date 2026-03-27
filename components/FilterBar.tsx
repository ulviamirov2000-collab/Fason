'use client'

import { useState } from 'react'
import { CATEGORIES, SUBCATEGORIES, FILTER_SIZES_BY_CATEGORY, SIZES_BY_SUBCATEGORY, DEFAULT_SIZES } from '@/lib/sizes'

const conditions_az = ['Hamısı', 'Yeni', 'Yaxşı', 'Orta']

const chipBase =
  'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-2 whitespace-nowrap'
const chipActive = 'text-black border-transparent'
const chipInactive = 'bg-white text-gray-700 hover:border-pink-400 border-gray-200'

export default function FilterBar({ lang = 'AZ' }: { lang?: 'AZ' | 'RU' }) {
  const [category, setCategory] = useState<string | null>(null)
  const [subcategory, setSubcategory] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)
  const [condition, setCondition] = useState(0)
  const [priceMax, setPriceMax] = useState('')

  function selectCategory(cat: string | null) {
    setCategory(cat)
    setSubcategory(null)
    setSize(null)
  }

  function selectSubcategory(sub: string | null) {
    setSubcategory(sub)
    setSize(null)
  }

  // Sizes: use subcategory-specific if selected, else category fallback
  const sizes = subcategory
    ? (SIZES_BY_SUBCATEGORY[subcategory] ?? DEFAULT_SIZES)
    : category
    ? (FILTER_SIZES_BY_CATEGORY[category] ?? DEFAULT_SIZES)
    : DEFAULT_SIZES

  const subcategoryList = category ? (SUBCATEGORIES[category] ?? []) : []

  return (
    <div
      className="sticky top-[65px] z-40 w-full py-3 px-4 border-b-2"
      style={{ backgroundColor: '#FAF7F2', borderColor: '#1a1040' }}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-2">

        {/* ── Row 1: Categories ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => selectCategory(null)}
            className={`${chipBase} ${!category ? chipActive : chipInactive}`}
            style={!category ? { backgroundColor: '#FF2D78', borderColor: '#FF2D78' } : {}}
          >
            Hamısı
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => selectCategory(category === cat ? null : cat)}
              className={`${chipBase} ${category === cat ? chipActive : chipInactive}`}
              style={category === cat ? { backgroundColor: '#FF2D78', borderColor: '#FF2D78' } : {}}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Row 2: Subcategories (when category selected) ── */}
        {category && subcategoryList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => selectSubcategory(null)}
              className={`${chipBase} ${!subcategory ? chipActive : chipInactive}`}
              style={!subcategory ? { backgroundColor: '#1a1040', borderColor: '#1a1040', color: 'white' } : {}}
            >
              Hamısı
            </button>
            {subcategoryList.map((sub) => (
              <button
                key={sub}
                onClick={() => selectSubcategory(subcategory === sub ? null : sub)}
                className={`${chipBase} ${subcategory === sub ? chipActive : chipInactive}`}
                style={subcategory === sub ? { backgroundColor: '#1a1040', borderColor: '#1a1040', color: 'white' } : {}}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* ── Row 3: Sizes + Condition + Price ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
          {sizes.map((s) => (
            <button
              key={s}
              onClick={() => setSize(size === s ? null : s)}
              className={`${chipBase} ${size === s ? chipActive : chipInactive}`}
              style={size === s ? { backgroundColor: '#FFE600', borderColor: '#1a1040' } : {}}
            >
              {s}
            </button>
          ))}

          <div className="w-px h-5 bg-gray-300 flex-shrink-0 mx-1" />

          {conditions_az.map((cond, i) => (
            <button
              key={cond}
              onClick={() => setCondition(i)}
              className={`${chipBase} ${condition === i ? chipActive : chipInactive}`}
              style={condition === i ? { backgroundColor: '#00E5CC', borderColor: '#1a1040' } : {}}
            >
              {cond}
            </button>
          ))}

          <div className="w-px h-5 bg-gray-300 flex-shrink-0 mx-1" />

          <div className="flex-shrink-0 flex items-center gap-1 bg-white border-2 border-gray-200 rounded-full px-3 py-1">
            <span className="text-xs text-gray-500">
              {lang === 'AZ' ? 'Max ₼' : 'Макс ₼'}
            </span>
            <input
              type="number"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="999"
              className="w-12 text-xs outline-none bg-transparent"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
