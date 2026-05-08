'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import FilterBar from '@/components/FilterBar'
import CategoryNav from '@/components/CategoryNav'
import ListingCard, { MockListing } from '@/components/ListingCard'
import Footer from '@/components/Footer'
import { supabase } from '@/lib/supabase'
import type { ListingRow } from '@/lib/supabase'
import { SIZES_BY_SUBCATEGORY, FILTER_SIZES_BY_CATEGORY, DEFAULT_SIZES } from '@/lib/sizes'

const CONDITION_VALUES = ['', 'new', 'good', 'fair'] as const

function toCard(
  l: ListingRow,
  seller: { name: string; avatar_url?: string | null },
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
    views: l.views,
    basket_count: l.basket_count,
  }
}

function HomePageContent() {
  const searchParams = useSearchParams()
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
  const [filterSearch,      setFilterSearch]       = useState(searchParams.get('q') ?? '')

  // Sync filterSearch when URL ?q param changes
  useEffect(() => {
    setFilterSearch(searchParams.get('q') ?? '')
  }, [searchParams])

  // ── Fetch listings whenever any filter changes ─────────────────────────────
  const fetchListings = useCallback(async () => {
    setLoading(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase
      .from('listings')
      .select('*, users:seller_id(full_name, email, avatar_url)')
      .eq('status', 'active')

    if (filterSearch)       query = query.ilike('title_az', `%${filterSearch}%`)
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
        ) => {
          const u = row.users
          const name = u?.full_name || u?.email?.split('@')[0] || 'Satıcı'
          return toCard(row, { name, avatar_url: u?.avatar_url ?? null })
        }
      )
      setListings(cards)
    } else {
      setListings([])
    }
    setLoading(false)
  }, [filterSearch, activeGender, filterCategory, filterSubcategory, filterBrand, filterPriceMin, filterPriceMax, filterSizes, filterColors, filterCondition, filterSort])

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

  // Sizes shown in the Ölçü dropdown — context-aware
  const availableSizes = filterSubcategory
    ? (SIZES_BY_SUBCATEGORY[filterSubcategory] ?? DEFAULT_SIZES)
    : filterCategory
    ? (FILTER_SIZES_BY_CATEGORY[filterCategory] ?? DEFAULT_SIZES)
    : []

  const GENDER_LABELS: Record<string, string> = { qadin: 'Qadın', kisi: 'Kişi', usaq: 'Uşaq', el: 'Əl işi' }

  const headingLabel = filterSearch
    ? 'Axtarış nəticələri'
    : filterSubcategory
    ? filterSubcategory
    : filterCategory
    ? filterCategory
    : activeGender
    ? GENDER_LABELS[activeGender] ?? 'Tövsiyə edirik'
    : 'Tövsiyə edirik'

  return (
    <main>
      {/* ── Promo banner ── */}
      <div className="w-full relative overflow-hidden" style={{ background: 'linear-gradient(120deg, #FF2D78 0%, #1a1040 100%)', minHeight: '130px' }}>
        <div className="max-w-7xl mx-auto px-6 py-8 flex items-center justify-between gap-4">
          <div>
            <div className="text-3xl sm:text-4xl font-black text-white leading-tight" style={{ fontFamily: 'var(--font-unbounded)' }}>
              DOLABINI<br/>PULA ÇEVİR
            </div>
            <div className="text-white/70 text-sm mt-1">Azərbaycanda ikinci əl geyim platforması</div>
            <div className="flex gap-4 mt-3">
              {[{ num: '2.4K+', label: 'Elan' }, { num: '800+', label: 'Satıcı' }].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-lg font-bold" style={{ color: '#FFE600', fontFamily: 'var(--font-unbounded)' }}>{s.num}</div>
                  <div className="text-white/50 text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-shrink-0 opacity-20 hidden sm:block">
            <div className="text-8xl font-black text-white" style={{ fontFamily: 'var(--font-unbounded)' }}>✦</div>
          </div>
        </div>
      </div>

      {/* ── CategoryNav — sticky just below navbar (~65px) ── */}
      <div className="sticky top-[65px] z-40">
        <CategoryNav
          onSelect={handleCategoryNavSelect}
          onGenderChange={handleGenderChange}
          activeCategory={filterCategory}
          activeSubcategory={filterSubcategory}
        />
      </div>

      {/* ── FilterBar — sticky below navbar + category nav ── */}
      <div className="sticky top-[109px] z-30">
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
            {filterSearch && (
              <span className="text-sm font-normal text-gray-400 ml-2">&ldquo;{filterSearch}&rdquo;</span>
            )}
          </h2>
          <span className="text-sm text-gray-400">
            {loading ? '...' : `${listings.length} elan`}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-gray-200 animate-pulse"
                style={{ aspectRatio: '3/4', border: '1px solid #e5e7eb' }}
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
                setFilterSearch('')
              }}
              className="mt-3 text-sm font-semibold underline"
              style={{ color: '#FF2D78' }}
            >
              Filtrləri sıfırla
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
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

      {/* ── Kuryerlər üçün ── */}
      <section
        id="couriers"
        className="w-full py-20 px-4"
        style={{ backgroundColor: '#FAF7F2' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span
              className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-3"
              style={{ backgroundColor: '#FFE600', color: '#1a1040', border: '1.5px solid #1a1040' }}
            >
              Tezliklə
            </span>
            <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: '#FF2D78' }}>
              Əməkdaşlıq
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold"
              style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
            >
              Kuryerlər üçün
            </h2>
            <p className="mt-3 text-sm leading-relaxed max-w-lg mx-auto text-gray-500">
              FASON-un kuryer tərəfdaşı ol. Aktiv elanları, çatdırılma rayonlarını və qiymətləri real vaxtda izlə — öz sürətinlə işlə.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF2D78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                ),
                title: 'Real vaxt elanlar',
                desc: 'Yeni çatdırılma tələbləri dərhal görünür — gecikdirmə yoxdur.',
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF2D78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                ),
                title: 'Rayon xəritəsi',
                desc: 'Hansı ərazidə nə qədər elan olduğunu görüb marşrut qur.',
              },
              {
                icon: (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF2D78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                ),
                title: 'Şəffaf qiymətlər',
                desc: 'Hər çatdırılma üçün əvvəlcədən müəyyən edilmiş tarif.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col gap-3 p-6 rounded-2xl bg-white"
                style={{ border: '1.5px solid #e5e7eb' }}
              >
                <div>{item.icon}</div>
                <p className="font-bold text-sm" style={{ color: '#1a1040' }}>{item.title}</p>
                <p className="text-xs leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>

          <div
            className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 sm:p-8 rounded-2xl"
            style={{ backgroundColor: '#1a1040', border: '2px solid #1a1040' }}
          >
            <div>
              <p className="font-bold text-white text-base" style={{ fontFamily: 'var(--font-unbounded)' }}>
                Hazırsansa, siyahıya əlavə ol
              </p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                Kuryer portalı açılarkən ilk xəbər sən alacaqsan.
              </p>
            </div>
            <a
              href="mailto:fason.store@gmail.com?subject=Kuryer əməkdaşlığı"
              className="flex-shrink-0 px-7 py-3.5 rounded-2xl font-bold text-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: '#FFE600', color: '#1a1040', border: '2px solid #FFE600', boxShadow: '3px 3px 0 rgba(255,255,255,0.15)' }}
            >
              Maraqlanıram →
            </a>
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

export default function HomePage() {
  return (
    <Suspense>
      <HomePageContent />
    </Suspense>
  )
}
