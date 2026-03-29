'use client'

const CONDITIONS = ['Hamısı', 'Yeni', 'Yaxşı', 'Orta']

const SORT_OPTIONS = [
  { key: 'newest',     label: 'Ən son' },
  { key: 'price_asc',  label: 'Ucuzdan bahaya' },
  { key: 'price_desc', label: 'Bahadan ucuza' },
  { key: 'views',      label: 'Ən çox baxılan' },
]

type Props = {
  availableSizes:    string[]
  size:              string | null
  condition:         number
  sort:              string
  onSizeChange:      (size: string | null) => void
  onConditionChange: (cond: number) => void
  onSortChange:      (sort: string) => void
  lang?: 'AZ' | 'RU'
}

const chipBase =
  'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-2 whitespace-nowrap'

const chipInactive =
  `${chipBase} bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-400`

const activeSize      = { backgroundColor: '#FFE600', borderColor: '#1a1040', color: '#1a1040' }
const activeCondition = { backgroundColor: '#00E5CC', borderColor: '#1a1040', color: '#1a1040' }
const activeSort      = { backgroundColor: '#FF2D78', borderColor: '#FF2D78', color: 'white'   }

export default function FilterBar({
  availableSizes, size, condition, sort,
  onSizeChange, onConditionChange, onSortChange,
  lang = 'AZ',
}: Props) {
  return (
    <div
      className="w-full py-2.5 px-4 border-b-2"
      style={{ backgroundColor: '#FAF7F2', borderColor: '#1a1040' }}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-2">

        {/* ── Sizes + Condition ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
          {availableSizes.map((s) => (
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

        {/* ── Sort ── */}
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
