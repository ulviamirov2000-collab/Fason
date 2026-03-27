'use client'

import { CATEGORIES, SUBCATEGORIES, FILTER_SIZES_BY_CATEGORY, SIZES_BY_SUBCATEGORY, DEFAULT_SIZES } from '@/lib/sizes'

const CONDITIONS = ['Hamısı', 'Yeni', 'Yaxşı', 'Orta']

const SORT_OPTIONS = [
  { key: 'newest', label: 'Ən son' },
  { key: 'price_asc', label: 'Ucuzdan bahaya' },
  { key: 'price_desc', label: 'Bahadan ucuza' },
  { key: 'views', label: 'Ən çox baxılan' },
]

type Props = {
  category: string | null
  subcategory: string | null
  size: string | null
  condition: number
  sort: string
  onCategoryChange: (cat: string | null) => void
  onSubcategoryChange: (sub: string | null) => void
  onSizeChange: (size: string | null) => void
  onConditionChange: (cond: number) => void
  onSortChange: (sort: string) => void
  lang?: 'AZ' | 'RU'
}

const chip = 'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-2 whitespace-nowrap'

export default function FilterBar({
  category, subcategory, size, condition, sort,
  onCategoryChange, onSubcategoryChange, onSizeChange, onConditionChange, onSortChange,
  lang = 'AZ',
}: Props) {
  const subcategoryList = category ? (SUBCATEGORIES[category] ?? []) : []

  const sizes = subcategory
    ? (SIZES_BY_SUBCATEGORY[subcategory] ?? DEFAULT_SIZES)
    : category
    ? (FILTER_SIZES_BY_CATEGORY[category] ?? DEFAULT_SIZES)
    : DEFAULT_SIZES

  return (
    <div
      className="w-full py-3 px-4 border-b-2"
      style={{ backgroundColor: '#FAF7F2', borderColor: '#1a1040' }}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-2">

        {/* ── Row 1: Categories ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => onCategoryChange(null)}
            className={chip}
            style={
              !category
                ? { backgroundColor: '#FF2D78', borderColor: '#FF2D78', color: 'white' }
                : { backgroundColor: 'white', color: '#555', borderColor: '#ddd' }
            }
          >
            Hamısı
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(category === cat ? null : cat)}
              className={chip}
              style={
                category === cat
                  ? { backgroundColor: '#FF2D78', borderColor: '#FF2D78', color: 'white' }
                  : { backgroundColor: 'white', color: '#555', borderColor: '#ddd' }
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Row 2: Subcategories (when category selected) ── */}
        {category && subcategoryList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => onSubcategoryChange(null)}
              className={chip}
              style={
                !subcategory
                  ? { backgroundColor: '#1a1040', borderColor: '#1a1040', color: 'white' }
                  : { backgroundColor: 'white', color: '#555', borderColor: '#ddd' }
              }
            >
              Hamısı
            </button>
            {subcategoryList.map((sub) => (
              <button
                key={sub}
                onClick={() => onSubcategoryChange(subcategory === sub ? null : sub)}
                className={chip}
                style={
                  subcategory === sub
                    ? { backgroundColor: '#1a1040', borderColor: '#1a1040', color: 'white' }
                    : { backgroundColor: 'white', color: '#555', borderColor: '#ddd' }
                }
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
              onClick={() => onSizeChange(size === s ? null : s)}
              className={chip}
              style={
                size === s
                  ? { backgroundColor: '#FFE600', borderColor: '#1a1040', color: '#1a1040' }
                  : { backgroundColor: 'white', color: '#555', borderColor: '#ddd' }
              }
            >
              {s}
            </button>
          ))}

          <div className="w-px h-5 bg-gray-300 flex-shrink-0 mx-1" />

          {CONDITIONS.map((cond, i) => (
            <button
              key={cond}
              onClick={() => onConditionChange(i)}
              className={chip}
              style={
                condition === i
                  ? { backgroundColor: '#00E5CC', borderColor: '#1a1040', color: '#1a1040' }
                  : { backgroundColor: 'white', color: '#555', borderColor: '#ddd' }
              }
            >
              {cond}
            </button>
          ))}
        </div>

        {/* ── Row 4: Sort options ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
          <span className="text-xs text-gray-400 flex-shrink-0 mr-1">
            {lang === 'AZ' ? 'Sırala:' : 'Сорт:'}
          </span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onSortChange(opt.key)}
              className={chip}
              style={
                sort === opt.key
                  ? { backgroundColor: '#FF2D78', borderColor: '#FF2D78', color: 'white' }
                  : { backgroundColor: 'white', color: '#555', borderColor: '#ddd' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
