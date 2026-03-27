'use client'

import { useState } from 'react'
import { FILTER_SIZES_BY_CATEGORY, DEFAULT_SIZES } from '@/lib/sizes'

const categories_az = ['Hamısı', 'Geyim', 'Ayaqqabı', 'Aksesuar', 'Çanta']
const categories_ru = ['Все', 'Одежда', 'Обувь', 'Аксессуары', 'Сумки']
// Maps AZ category index to key used in FILTER_SIZES_BY_CATEGORY
const categoryKeys = [null, 'Geyim', 'Ayaqqabı', 'Aksesuar', 'Çanta']

const conditions_az = ['Hamısı', 'Yeni', 'Yaxşı', 'Orta']
const conditions_ru = ['Все', 'Новый', 'Хорошее', 'Среднее']

export default function FilterBar({ lang = 'AZ' }: { lang?: 'AZ' | 'RU' }) {
  const [category, setCategory] = useState(0)
  const [size, setSize] = useState<string | null>(null)
  const [condition, setCondition] = useState(0)
  const [priceMax, setPriceMax] = useState('')

  const categories = lang === 'AZ' ? categories_az : categories_ru
  const conditions = lang === 'AZ' ? conditions_az : conditions_ru

  const catKey = categoryKeys[category]
  const sizes = catKey ? (FILTER_SIZES_BY_CATEGORY[catKey] ?? DEFAULT_SIZES) : DEFAULT_SIZES

  const chipBase =
    'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border-2 whitespace-nowrap'
  const chipActive = 'text-black border-transparent'
  const chipInactive = 'bg-white text-gray-700 hover:border-pink-400'

  return (
    <div
      className="sticky top-[65px] z-40 w-full py-3 px-4 border-b-2"
      style={{ backgroundColor: '#FAF7F2', borderColor: '#1a1040' }}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        {/* Categories row */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat, i) => (
            <button
              key={cat}
              onClick={() => { setCategory(i); setSize(null) }}
              className={`${chipBase} ${
                category === i
                  ? `${chipActive}`
                  : `${chipInactive} border-gray-200`
              }`}
              style={
                category === i
                  ? { backgroundColor: '#FF2D78', borderColor: '#FF2D78' }
                  : {}
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sizes + Condition + Price row */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
          {/* Sizes */}
          {sizes.map((s) => (
            <button
              key={s}
              onClick={() => setSize(size === s ? null : s)}
              className={`${chipBase} ${
                size === s
                  ? `${chipActive}`
                  : `${chipInactive} border-gray-200`
              }`}
              style={
                size === s
                  ? { backgroundColor: '#FFE600', borderColor: '#1a1040' }
                  : {}
              }
            >
              {s}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-5 bg-gray-300 flex-shrink-0 mx-1" />

          {/* Conditions */}
          {conditions.map((cond, i) => (
            <button
              key={cond}
              onClick={() => setCondition(i)}
              className={`${chipBase} ${
                condition === i
                  ? `${chipActive}`
                  : `${chipInactive} border-gray-200`
              }`}
              style={
                condition === i
                  ? { backgroundColor: '#00E5CC', borderColor: '#1a1040' }
                  : {}
              }
            >
              {cond}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-5 bg-gray-300 flex-shrink-0 mx-1" />

          {/* Price max */}
          <div
            className="flex-shrink-0 flex items-center gap-1 bg-white border-2 border-gray-200 rounded-full px-3 py-1"
          >
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
