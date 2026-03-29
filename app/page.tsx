'use client'

import Image from 'next/image'
import { useEffect, useState, useCallback } from 'react'
import FilterBar from '@/components/FilterBar'
import SearchBar from '@/components/SearchBar'
import CategoryNav from '@/components/CategoryNav'
import ListingCard, { MockListing } from '@/components/ListingCard'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabase'
import type { ListingRow } from '@/lib/supabase'
import { SIZES_BY_SUBCATEGORY, FILTER_SIZES_BY_CATEGORY, DEFAULT_SIZES } from '@/lib/sizes'

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

  // ── Filter state ──────────────────────────────────────────────────────────
  const [activeGender,      setActiveGender]       = useState<string | null>(null)
  const [filterCategory,    setFilterCategory]    = useState<string | null>(null)
  const [filterSubcategory, setFilterSubcategory] = useState<string | null>(null)
  const [filterBrand,       setFilterBrand]       = useState('')
  const [filterPriceMin,    setFilterPriceMin]     = useState('')
  const [filterPriceMax,    setFilterPriceMax]     = useState('')
  const [filterSizes,       setFilterSizes]        = useState<string[]>([])
  const [filterColors,      setFilterColors]       = useState<string[]>([])
  const [filterCondition,   setFilterCondition]   = useState(0)
  const [filterSort,        setFilterSort]         = useState('newest')

  // ── Fetch listings whenever any filter changes ─────────────────────────────
  const fetchListings = useCallback(async () => {
    setLoading(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('listings')
      .select('*, users:seller_id(full_name, email, avatar_url)')
      .eq('status', 'active')

    if (activeGender)       query = query.eq('gender', activeGender)
    if (filterCategory)     query = query.eq('category', filterCategory)
    if (filterSubcategory)  query = query.eq('subcategory', filterSubcategory)
    if (filterBrand)        query = query.ilike('brand', `%${filterBrand}%`)
    if (filterPriceMin)     query = query.gte('price', parseFloat(filterPriceMin))
    if (filterPriceMax)     query = query.lte('price', parseFloat(filterPriceMax))
    if (filterSizes.length) query = query.in('size', filterSizes)
    if (filterColors.length) query = query.in('color', filterColors)
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
  }, [activeGender, filterCategory, filterSubcategory, filterBrand, filterPriceMin, filterPriceMax, filterSizes, filterColors, filterCondition, filterSort])

  useEffect(() => { fetchListings() }, [fetchListings])

  // ── Gender tab change — resets all subordinate filters ──
  function handleGenderChange(gender: string) {
    setActiveGender(gender)
    setFilterCategory(null)
    setFilterSubcategory(null)
    setFilterBrand('')
    setFilterPriceMin('')
    setFilterPriceMax('')
    setFilterSizes([])
    setFilterColors([])
    setFilterCondition(0)
  }

  // ── CategoryNav subcategory select ──
  function handleCategoryNavSelect(cat: string | null, sub: string | null) {
    setFilterCategory(cat)
    setFilterSubcategory(sub)
    setFilterSizes([])
  }

  // ── SearchBar handlers ──
  function handleSearchSelect(sub: string, cat: string) {
    setFilterSubcategory(sub)
    setFilterCategory(cat)
    setFilterSizes([])
  }

  function handleSearchClear() {
    setFilterSubcategory(null)
  }

  // Sizes shown in the Ölçü dropdown — context-aware
  const availableSizes = filterSubcategory
    ? (SIZES_BY_SUBCATEGORY[filterSubcategory] ?? DEFAULT_SIZES)
    : filterCategory
    ? (FILTER_SIZES_BY_CATEGORY[filterCategory] ?? DEFAULT_SIZES)
    : []

  const GENDER_LABELS: Record<string, string> = { qadin: 'Qadın', kisi: 'Kişi', usaq: 'Uşaq', el: 'Əl işi' }

  const headingLabel = filterSubcategory
    ? filterSubcategory
    : filterCategory
    ? filterCategory
    : activeGender
    ? GENDER_LABELS[activeGender] ?? 'Son Elanlar'
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

      {/* ── CategoryNav — sticky below navbar (~65px) ── */}
      <div className="sticky top-[65px] z-40">
        <CategoryNav
          onSelect={handleCategoryNavSelect}
          onGenderChange={handleGenderChange}
          activeCategory={filterCategory}
          activeSubcategory={filterSubcategory}
        />
      </div>

      {/* ── Search + FilterBar — sticky below CategoryNav (~65+44=109px) ── */}
      <div className="sticky top-[109px] z-30">
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

        {/* Filter bar — dropdown style */}
        <FilterBar
          availableSizes={availableSizes}
          brand={filterBrand}
          priceMin={filterPriceMin}
          priceMax={filterPriceMax}
          sizes={filterSizes}
          colors={filterColors}
          condition={filterCondition}
          sort={filterSort}
          onBrandChange={setFilterBrand}
          onPriceChange={(min, max) => { setFilterPriceMin(min); setFilterPriceMax(max) }}
          onSizesChange={setFilterSizes}
          onColorsChange={setFilterColors}
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
                setActiveGender(null)
                setFilterCategory(null)
                setFilterSubcategory(null)
                setFilterBrand('')
                setFilterPriceMin('')
                setFilterPriceMax('')
                setFilterSizes([])
                setFilterColors([])
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

      {/* ── Haqqımızda ── */}
      <section
        id="about"
        className="w-full py-20 px-4"
        style={{ backgroundColor: '#1a1040' }}
      >
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-10">
          <div className="text-center">
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#FF2D78' }}>
              Haqqımızda
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold text-white"
              style={{ fontFamily: 'var(--font-unbounded)' }}
            >
              FASON nədir?
            </h2>
            <p className="mt-4 text-sm leading-relaxed max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.6)' }}>
              FASON — Azərbaycanın ikinci əl geyim, ayaqqabı və aksesuar alqı-satqı platformasıdır.
              Dolabında artıq geyinmədiklərini sat, yeni sevimlilər tap.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
            {[
              {
                emoji: '🛡️',
                title: 'Təhlükəsiz alqı-satqı',
                desc: 'Satıcılarla birbaşa əlaqə qur, öz şərtlərinlə razılaş.',
              },
              {
                emoji: '💰',
                title: 'Pul qazan',
                desc: 'Geyinmədiklərini sat, pula çevir. Elan vermək tamamilə pulsuzdur.',
              },
              {
                emoji: '🔍',
                title: 'Asan axtarış',
                desc: 'Kateqoriya, ölçü, brend və qiymət üzrə filter et — istədiyini tap.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="flex flex-col gap-3 p-6 rounded-2xl"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <span className="text-3xl">{card.emoji}</span>
                <p className="font-bold text-white text-sm">{card.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Əlaqə ── */}
      <section
        id="contact"
        className="w-full py-20 px-4"
        style={{ backgroundColor: '#FAF7F2' }}
      >
        <div className="max-w-xl mx-auto flex flex-col items-center gap-6 text-center">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#FF2D78' }}>
            Əlaqə
          </p>
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
          >
            Bizimlə əlaqə saxla
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Sual, təklif və ya problemlə üzləşdinsə — bizə yaz. Tez cavab veririk!
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <a
              href="https://www.tiktok.com/@fason.store"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#1a1040', border: '2px solid #1a1040', boxShadow: '3px 3px 0 #FF2D78' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.22 8.22 0 004.84 1.56V6.8a4.85 4.85 0 01-1.07-.11z" />
              </svg>
              TikTok: @fason.store
            </a>
            <a
              href="mailto:fason.store@gmail.com"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#FFE600', border: '2px solid #1a1040', color: '#1a1040', boxShadow: '3px 3px 0 #1a1040' }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              E-poçt yaz
            </a>
          </div>
          <p className="text-xs text-gray-400">
            Instagram — Tezliklə aktiv olacaq
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
