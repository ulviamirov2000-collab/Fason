'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { ListingRow } from '@/lib/supabase'
import ChatDrawer from '@/components/ChatDrawer'

type FullListing = ListingRow & {
  users: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

const conditionMap = {
  new:  { label: 'Yeni',  color: '#00E5CC' },
  good: { label: 'Yaxşı', color: '#FF9500' },
  fair: { label: 'Orta',  color: '#FF2D78' },
}

export default function ListingClient({ id }: { id: string }) {
  const router = useRouter()

  const [listing, setListing] = useState<FullListing | null>(null)
  const [activeImg, setActiveImg] = useState(0)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)

  // Basket state
  const [inBasket, setInBasket] = useState(false)
  const [basketLoading, setBasketLoading] = useState(false)

  // Social proof
  const [basketCount, setBasketCount] = useState(0)
  const [messageCount, setMessageCount] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))

    supabase
      .from('listings')
      .select('*, users:seller_id(id, full_name, email, avatar_url)')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setListing(data as FullListing)
        setBasketCount((data as FullListing)?.basket_count ?? 0)
        setLoading(false)
      })

    // Message count for this listing
    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', id)
      .then(({ count }) => setMessageCount(count ?? 0))
  }, [id])

  // Check if current user has this in their basket
  useEffect(() => {
    if (!currentUserId) { setInBasket(false); return }
    supabase
      .from('baskets')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('listing_id', id)
      .maybeSingle()
      .then(({ data }) => setInBasket(!!data))
  }, [currentUserId, id])

  async function toggleBasket() {
    if (!currentUserId) { router.push('/auth'); return }
    setBasketLoading(true)

    if (inBasket) {
      await supabase
        .from('baskets')
        .delete()
        .eq('user_id', currentUserId)
        .eq('listing_id', id)

      await supabase
        .from('listings')
        .update({ basket_count: Math.max(0, basketCount - 1) })
        .eq('id', id)

      setInBasket(false)
      setBasketCount((c) => Math.max(0, c - 1))
    } else {
      await supabase
        .from('baskets')
        .insert({ user_id: currentUserId, listing_id: id })

      await supabase
        .from('listings')
        .update({ basket_count: basketCount + 1 })
        .eq('id', id)

      setInBasket(true)
      setBasketCount((c) => c + 1)
    }

    setBasketLoading(false)
  }

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="text-gray-400 text-sm">Yüklənir...</div>
      </main>
    )
  }

  if (!listing) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-gray-600 font-semibold mb-1">Elan tapılmadı</p>
        <Link href="/" className="text-sm underline" style={{ color: '#FF2D78' }}>
          Ana səhifəyə qayıt
        </Link>
      </main>
    )
  }

  const cond = conditionMap[listing.condition] ?? conditionMap.good
  const seller = listing.users
  const sellerName = seller?.full_name || seller?.email?.split('@')[0] || 'Satıcı'
  const hasImages = listing.images && listing.images.length > 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subcategory: string | null = (listing as any).subcategory ?? null

  // Build social proof string
  const socialParts: string[] = []
  if ((listing.views ?? 0) > 0) socialParts.push(`👁 ${listing.views} baxış`)
  if (basketCount > 0) socialParts.push(`🛒 ${basketCount} səbətdə`)
  if (messageCount > 0) socialParts.push(`💬 ${messageCount} təklif`)

  return (
    <>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="flex flex-col gap-3">
            <div
              className="relative w-full h-[340px] md:h-[500px] rounded-2xl overflow-hidden bg-gradient-to-br from-pink-100 to-yellow-100 flex items-center justify-center"
              style={{ border: '2px solid #1a1040' }}
            >
              {hasImages ? (
                <Image
                  src={listing.images[activeImg]}
                  alt={listing.title_az}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-8xl">👗</span>
              )}
            </div>

            {hasImages && listing.images.length > 1 && (
              <div className="flex gap-2">
                {listing.images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 transition-all hover:scale-105"
                    style={{ border: i === activeImg ? '2px solid #FF2D78' : '2px solid #ccc' }}
                  >
                    <Image src={src} alt={`Foto ${i + 1}`} fill className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-4">
            {/* Breadcrumb */}
            {listing.category && (
              <p className="text-xs text-gray-400 font-medium">
                {listing.category}
                {subcategory && (
                  <span> › <span style={{ color: '#FF2D78' }}>{subcategory}</span></span>
                )}
              </p>
            )}

            {/* Title + price */}
            <div>
              <h1
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
              >
                {listing.title_az}
              </h1>
              <div
                className="inline-block mt-2 px-4 py-1.5 rounded-full text-xl font-bold text-black"
                style={{ backgroundColor: '#FFE600', border: '2px solid #1a1040' }}
              >
                {listing.price} ₼
              </div>
            </div>

            {/* Social proof */}
            {socialParts.length > 0 && (
              <p className="text-xs text-gray-400">{socialParts.join(' · ')}</p>
            )}

            {/* Chips */}
            <div className="flex flex-wrap gap-2">
              {listing.brand && (
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
                >
                  {listing.brand}
                </span>
              )}
              {listing.size && (
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
                >
                  {listing.size}
                </span>
              )}
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: cond.color, border: `2px solid ${cond.color}` }}
              >
                {cond.label}
              </span>
            </div>

            {/* Description */}
            {listing.description_az && (
              <p className="text-sm text-gray-700 leading-relaxed">{listing.description_az}</p>
            )}

            {/* Seller card */}
            {seller && (
              <div
                className="flex items-center gap-3 p-4 rounded-2xl"
                style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
              >
                <div
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 overflow-hidden flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                  style={{ border: '2px solid #1a1040' }}
                >
                  {seller.avatar_url ? (
                    <Image src={seller.avatar_url} alt={sellerName} width={48} height={48} className="object-cover w-full h-full" unoptimized />
                  ) : (
                    sellerName[0].toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: '#1a1040' }}>
                    {sellerName}
                  </p>
                </div>
                <Link
                  href={`/profile/${seller.id}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:bg-gray-50 flex-shrink-0"
                  style={{ border: '2px solid #1a1040', color: '#1a1040' }}
                >
                  Profil
                </Link>
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex flex-col gap-3">
              {seller && currentUserId !== seller.id && (
                <button
                  onClick={() => {
                    if (!currentUserId) { router.push('/auth'); return }
                    setChatOpen(true)
                  }}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-center transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040', boxShadow: '3px 3px 0 #1a1040' }}
                >
                  💬 Satıcıya yaz
                </button>
              )}
              <button
                onClick={toggleBasket}
                disabled={basketLoading}
                className="w-full py-3.5 rounded-2xl font-bold text-center transition-all hover:bg-gray-50 disabled:opacity-60"
                style={{ border: '2px solid #1a1040', color: '#1a1040', boxShadow: '3px 3px 0 #1a1040' }}
              >
                {inBasket ? '🛒 Səbətdən çıxar' : '🛒 Səbətə at'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {chatOpen && seller && currentUserId && (
        <ChatDrawer
          listingId={listing.id}
          sellerId={seller.id}
          sellerName={sellerName}
          sellerAvatarUrl={seller.avatar_url ?? undefined}
          listingTitle={listing.title_az}
          listingPrice={listing.price}
          listingImage={hasImages ? listing.images[0] : undefined}
          currentUserId={currentUserId}
          onClose={() => setChatOpen(false)}
        />
      )}
    </>
  )
}
