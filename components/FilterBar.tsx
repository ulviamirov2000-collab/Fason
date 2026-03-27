'use client'

import { CATEGORIES, SUBCATEGORIES, FILTER_SIZES_BY_CATEGORY, SIZES_BY_SUBCATEGORY, DEFAULT_SIZES } from '@/lib/sizes'

const CONDITIONS = ['Hamısı', 'Yeni', 'Yaxşı', 'Orta']

const SORT_OPTIONS = [
  { key: 'newest',     label: 'Ən son' },
  { key: 'price_asc',  label: 'Ucuzdan bahaya' },
  { key: 'price_desc', label: 'Bahadan ucuza' },
  { key: 'views',      label: 'Ən çox baxılan' },
]

type Props = {
  category:    string | null
  subcategory: string | null
  size:        string | null
  condition:   number
  sort:        string
  onCategoryChange:    (cat:  string | null) => void
  onSubcategoryChange: (sub:  string | null) => void
  onSizeChange:        (size: string | null) => void
  onConditionChange:   (cond: number) => void
  onSortChange:        (sort: string) => void
  lang?: 'AZ' | 'RU'
}

// Base chip — shared by all chip buttons
const chipBase =
  'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-2 whitespace-nowrap'

// Inactive chip — uses className only so Tailwind hover works
const chipInactive =
  `${chipBase} bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-400`

// Active styles per row (returned as style objects, override the className bg/border/color)
const activeCategory   = { backgroundColor: '#FF2D78', borderColor: '#FF2D78',  color: 'white'    }
const activeSubcat     = { backgroundColor: '#1a1040', borderColor: '#1a1040',  color: 'white'    }
const activeSize       = { backgroundColor: '#FFE600', borderColor: '#1a1040',  color: '#1a1040'  }
const activeCondition  = { backgroundColor: '#00E5CC', borderColor: '#1a1040',  color: '#1a1040'  }
const activeSort       = { backgroundColor: '#FF2D78', borderColor: '#FF2D78',  color: 'white'    }

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

        {/* ── Row 1: Main categories ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => onCategoryChange(null)}
            className={chipInactive}
            style={!category ? activeCategory : {}}
          >
            Hamısı
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(category === cat ? null : cat)}
              className={chipInactive}
              style={category === cat ? activeCategory : {}}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Row 2: Subcategories — only when a specific category is active ── */}
        {category && subcategoryList.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {/* "Hamısı" clears subcategory but keeps category */}
            <button
              onClick={() => onSubcategoryChange(null)}
              className={chipInactive}
              style={!subcategory ? activeSubcat : {}}
            >
              Hamısı
            </button>
            {subcategoryList.map((sub) => (
              <button
                key={sub}
                onClick={() => onSubcategoryChange(subcategory === sub ? null : sub)}
                className={chipInactive}
                style={subcategory === sub ? activeSubcat : {}}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* ── Row 3: Sizes + Condition ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
          {sizes.map((s) => (
            <button
              key={s}
              onClick={() => onSizeChange(size === s ? null : s)}
              className={chipInactive}
              style={size === s ? activeSize : {}}
            >
              {s}
            </button>
          ))}

          <div className="w-px h-5 bg-gray-300 flex-shrink-0 mx-1" />

          {CONDITIONS.map((cond, i) => (
            <button
              key={cond}
              onClick={() => onConditionChange(i)}
              className={chipInactive}
              style={condition === i ? activeCondition : {}}
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
              className={chipInactive}
              style={sort === opt.key ? activeSort : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>

      </div>
    </div>
  )
}
