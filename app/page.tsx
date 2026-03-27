'use client'

import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
import FilterBar from '@/components/FilterBar'
import SearchBar from '@/components/SearchBar'
import ListingCard, { MockListing } from '@/components/ListingCard'
import { supabase } from '@/lib/supabase'
import type { ListingRow } from '@/lib/supabase'

const CONDITION_VALUES = ['', 'new', 'good', 'fair'] as const
const ROTATIONS: (-1 | 0 | 1)[] = [-1, 1, -1, 0, 1, -1, 0, 1]

function toCard(
  l: ListingRow,
  seller: { name: string; avatar_url?: string | null },
  index: number
): MockListing {
  return {
    id: l.id,
    title_az: l.title_az,
    title_ru: l.title_ru,
    price: l.price,
    brand: l.brand ?? '',
    condition: l.condition,
    images: l.images,
    seller,
    rotation: ROTATIONS[index % ROTATIONS.length],
  }
}

export default function HomePage() {
  const [listings, setListings] = useState<MockListing[]>([])
  const [loading, setLoading] = useState(true)

  // ── Filter state (all lifted here so we can build the Supabase query) ──
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [filterSubcategory, setFilterSubcategory] = useState<string | null>(null)
  const [filterSize, setFilterSize] = useState<string | null>(null)
  const [filterCondition, setFilterCondition] = useState(0)
  const [filterSort, setFilterSort] = useState('newest')

  // ── Fetch listings whenever any filter changes ──
  const fetchListings = useCallback(async () => {
    setLoading(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('listings')
      .select('*, users:seller_id(full_name, email, avatar_url)')
      .eq('status', 'active')

    if (filterCategory) query = query.eq('category', filterCategory)
    if (filterSubcategory) query = query.eq('subcategory', filterSubcategory)
    if (filterSize) query = query.eq('size', filterSize)
    if (filterCondition > 0) query = query.eq('condition', CONDITION_VALUES[filterCondition])

    switch (filterSort) {
      case 'price_asc':  query = query.order('price', { ascending: true });  break
      case 'price_desc': query = query.order('price', { ascending: false }); break
      case 'views':      query = query.order('views', { ascending: false }); break
      default:           query = query.order('created_at', { ascending: false })
    }

    query = query.limit(40)

    const { data } = await query

    if (data) {
      const cards = data.map(
        (
          row: ListingRow & { users?: { full_name: string | null; email: string | null; avatar_url: string | null } | null },
          i: number
        ) => {
          const u = row.users
          const name = u?.full_name || u?.email?.split('@')[0] || 'Satıcı'
          return toCard(row, { name, avatar_url: u?.avatar_url ?? null }, i)
        }
      )
      setListings(cards)
    } else {
      setListings([])
    }
    setLoading(false)
  }, [filterCategory, filterSubcategory, filterSize, filterCondition, filterSort])

  useEffect(() => { fetchListings() }, [fetchListings])

  // ── Search bar handlers ──
  function handleSearchSelect(sub: string, cat: string) {
    setFilterSubcategory(sub)
    setFilterCategory(cat)
  }

  function handleSearchClear() {
    setFilterSubcategory(null)
    // Don't clear category — user may have set it manually in FilterBar
  }

  // ── FilterBar handlers ──
  function handleCategoryChange(cat: string | null) {
    setFilterCategory(cat)
    setFilterSubcategory(null)
    setFilterSize(null)
  }

  function handleSubcategoryChange(sub: string | null) {
    setFilterSubcategory(sub)
    setFilterSize(null)
  }

  // Heading reflects active filter
  const headingLabel = filterSubcategory
    ? filterSubcategory
    : filterCategory
    ? filterCategory
    : 'Son Elanlar'

  return (
    <main>
      {/* ── Hero ── */}
      <section
        className="w-full flex flex-col items-center justify-center py-16 px-4 relative overflow-hidden"
        style={{ backgroundColor: '#1a1040', minHeight: '340px' }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: '#FF2D78', transform: 'translate(30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: '#00E5CC', transform: 'translate(-30%, 30%)' }}
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Image
            src="/fason-logo (2).png"
            alt="FASON"
            width={400}
            height={200}
            className="object-contain"
            priority
          />
          <p
            className="text-white text-center tracking-[0.25em]"
            style={{ fontFamily: 'var(--font-unbounded)', fontSize: '0.85rem' }}
          >
            DOLABINI PULA ÇEVİR
          </p>
          <div className="flex gap-6 mt-2">
            {[
              { num: '2.4K+', label_az: 'Elan' },
              { num: '800+', label_az: 'Satıcı' },
              { num: '12K+', label_az: 'İstifadəçi' },
            ].map((s) => (
              <div key={s.label_az} className="text-center">
                <div className="text-xl font-bold" style={{ color: '#FFE600', fontFamily: 'var(--font-unbounded)' }}>
                  {s.num}
                </div>
                <div className="text-white/50 text-xs">{s.label_az}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sticky search + filter wrapper ── */}
      <div className="sticky top-[65px] z-40">
        {/* Search bar */}
        <div
          className="w-full px-4 py-3"
          style={{ backgroundColor: '#FAF7F2', borderBottom: '2px solid #1a1040' }}
        >
          <div className="max-w-7xl mx-auto">
            <SearchBar
              selectedSubcategory={filterSubcategory}
              onSelect={handleSearchSelect}
              onClear={handleSearchClear}
            />
          </div>
        </div>

        {/* Filter bar */}
        <FilterBar
          category={filterCategory}
          subcategory={filterSubcategory}
          size={filterSize}
          condition={filterCondition}
          sort={filterSort}
          onCategoryChange={handleCategoryChange}
          onSubcategoryChange={handleSubcategoryChange}
          onSizeChange={setFilterSize}
          onConditionChange={setFilterCondition}
          onSortChange={setFilterSort}
        />
      </div>

      {/* ── Listings Grid ── */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
          >
            {headingLabel}
          </h2>
          <span className="text-sm text-gray-400">
            {loading ? '...' : `${listings.length} elan`}
          </span>
        </div>

        {loading ? (
          <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="break-inside-avoid rounded-2xl bg-gray-200 animate-pulse"
                style={{ height: i % 2 === 0 ? 260 : 220, border: '2px solid #e5e7eb' }}
              />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 rounded-2xl" style={{ border: '2px dashed #ccc' }}>
            <div className="text-4xl mb-3">🔍</div>
            <p className="text-gray-500 text-sm">Bu filtrlərə uyğun elan tapılmadı.</p>
            <button
              onClick={() => {
                setFilterCategory(null)
                setFilterSubcategory(null)
                setFilterSize(null)
                setFilterCondition(0)
                setFilterSort('newest')
              }}
              className="mt-3 text-sm font-semibold underline"
              style={{ color: '#FF2D78' }}
            >
              Filtrləri sıfırla
            </button>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
            {listings.map((listing) => (
              <div key={listing.id} className="break-inside-avoid">
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
