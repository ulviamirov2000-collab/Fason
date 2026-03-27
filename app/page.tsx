'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import FilterBar from '@/components/FilterBar'
import ListingCard, { MockListing } from '@/components/ListingCard'
import { supabase } from '@/lib/supabase'
import type { ListingRow } from '@/lib/supabase'

const ROTATIONS: (-1 | 0 | 1)[] = [-1, 1, -1, 0, 1, -1, 0, 1]

function toCard(l: ListingRow, seller: { name: string; avatar_url?: string | null }, index: number): MockListing {
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

  useEffect(() => {
    async function fetchListings() {
      const { data } = await supabase
        .from('listings')
        .select('*, users:seller_id(full_name, email, avatar_url)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(40)

      if (data) {
        const cards = data.map((row: ListingRow & { users?: { full_name: string | null; email: string | null; avatar_url: string | null } | null }, i: number) => {
          const u = row.users
          const name = u?.full_name || u?.email?.split('@')[0] || 'Satıcı'
          return toCard(row, { name, avatar_url: u?.avatar_url ?? null }, i)
        })
        setListings(cards)
      }
      setLoading(false)
    }
    fetchListings()
  }, [])

  return (
    <main>
      {/* Hero Section */}
      <section
        className="w-full flex flex-col items-center justify-center py-16 px-4 relative overflow-hidden"
        style={{ backgroundColor: '#1a1040', minHeight: '340px' }}
      >
        {/* Decorative blobs */}
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: '#FF2D78', transform: 'translate(30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-48 h-48 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: '#00E5CC', transform: 'translate(-30%, 30%)' }}
        />

        {/* Logo */}
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

          {/* Stats strip */}
          <div className="flex gap-6 mt-2">
            {[
              { num: '2.4K+', label_az: 'Elan' },
              { num: '800+', label_az: 'Satıcı' },
              { num: '12K+', label_az: 'İstifadəçi' },
            ].map((s) => (
              <div key={s.label_az} className="text-center">
                <div
                  className="text-xl font-bold"
                  style={{ color: '#FFE600', fontFamily: 'var(--font-unbounded)' }}
                >
                  {s.num}
                </div>
                <div className="text-white/50 text-xs">{s.label_az}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <FilterBar />

      {/* Listings Grid */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
          >
            Son Elanlar
          </h2>
          <span className="text-sm text-gray-400">
            {loading ? '...' : `${listings.length} elan`}
          </span>
        </div>

        {loading ? (
          /* Skeleton */
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
          <div
            className="text-center py-20 rounded-2xl"
            style={{ border: '2px dashed #ccc' }}
          >
            <div className="text-4xl mb-3">🛍️</div>
            <p className="text-gray-500 text-sm">Hələ heç bir elan yoxdur.</p>
            <p className="text-gray-400 text-xs mt-1">İlk elanı sən ver!</p>
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
