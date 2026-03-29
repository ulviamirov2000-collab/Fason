'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import ChatDrawer from '@/components/ChatDrawer'

type BasketItem = {
  basket_id: string
  listing_id: string
  title_az: string
  price: number
  images: string[]
  brand: string | null
  condition: 'new' | 'good' | 'fair'
  seller_id: string
  seller_name: string
  seller_avatar: string | null
}

const conditionMap = {
  new:  { label: 'Yeni',  color: '#00E5CC' },
  good: { label: 'Yaxşı', color: '#FF9500' },
  fair: { label: 'Orta',  color: '#FF2D78' },
}

export default function BasketPage() {
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [items, setItems] = useState<BasketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [chat, setChat] = useState<BasketItem | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id ?? null
      setCurrentUserId(uid)
      if (!uid) { router.push('/auth'); return }
      fetchBasket(uid)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchBasket(uid: string) {
    setLoading(true)

    const { data: baskets } = await supabase
      .from('baskets')
      .select('id, listing_id')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })

    if (!baskets || baskets.length === 0) {
      setItems([])
      setLoading(false)
      return
    }

    const listingIds = baskets.map((b) => b.listing_id)

    const { data: listings } = await supabase
      .from('listings')
      .select('id, title_az, price, images, brand, condition, seller_id, users:seller_id(full_name, email, avatar_url)')
      .in('id', listingIds)

    if (!listings) { setItems([]); setLoading(false); return }

    const mapped: BasketItem[] = baskets.map((b) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const l = listings.find((x) => x.id === b.listing_id) as any
      if (!l) return null
      const u = l.users
      const seller_name = u?.full_name || u?.email?.split('@')[0] || 'Satıcı'
      return {
        basket_id: b.id,
        listing_id: l.id,
        title_az: l.title_az,
        price: l.price,
        images: l.images ?? [],
        brand: l.brand,
        condition: l.condition,
        seller_id: l.seller_id,
        seller_name,
        seller_avatar: u?.avatar_url ?? null,
      }
    }).filter(Boolean) as BasketItem[]

    setItems(mapped)
    setLoading(false)
  }

  async function removeItem(item: BasketItem) {
    if (!currentUserId) return
    setRemoving(item.basket_id)

    await supabase.from('baskets').delete().eq('id', item.basket_id)

    // Decrement basket_count on listing
    const { data: l } = await supabase
      .from('listings')
      .select('basket_count')
      .eq('id', item.listing_id)
      .single()
    if (l) {
      await supabase
        .from('listings')
        .update({ basket_count: Math.max(0, (l.basket_count ?? 1) - 1) })
        .eq('id', item.listing_id)
    }

    setItems((prev) => prev.filter((x) => x.basket_id !== item.basket_id))
    setRemoving(null)
  }

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="text-gray-400 text-sm">Yüklənir...</div>
      </main>
    )
  }

  return (
    <>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
        >
          🛒 Səbətim
        </h1>

        {items.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-3xl text-center"
            style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
          >
            <div className="text-5xl mb-4">🛒</div>
            <p className="text-lg font-bold mb-1" style={{ color: '#1a1040' }}>Səbətiniz boşdur</p>
            <p className="text-sm text-gray-400 mb-6">Bəyəndiyiniz elanları buraya əlavə edin</p>
            <Link
              href="/"
              className="px-6 py-2.5 rounded-full text-sm font-bold text-white transition-transform hover:scale-105"
              style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040' }}
            >
              Elanlara bax
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((item) => {
              const cond = conditionMap[item.condition] ?? conditionMap.good
              return (
                <div
                  key={item.basket_id}
                  className="flex gap-4 p-4 rounded-2xl bg-white"
                  style={{ border: '2px solid #1a1040' }}
                >
                  {/* Image */}
                  <Link href={`/listing/${item.listing_id}`} className="flex-shrink-0">
                    <div
                      className="relative w-24 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-pink-100 to-yellow-100"
                      style={{ border: '1.5px solid #1a1040' }}
                    >
                      {item.images[0] ? (
                        <Image
                          src={item.images[0]}
                          alt={item.title_az}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">👗</div>
                      )}
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <Link href={`/listing/${item.listing_id}`}>
                      <p className="font-bold text-sm truncate" style={{ color: '#1a1040' }}>
                        {item.title_az}
                      </p>
                    </Link>

                    <div
                      className="inline-block self-start px-3 py-0.5 rounded-full text-sm font-bold text-black"
                      style={{ backgroundColor: '#FFE600', border: '1.5px solid #1a1040' }}
                    >
                      {item.price} ₼
                    </div>

                    <div className="flex items-center gap-2">
                      {item.brand && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ border: '1px solid #1a1040' }}
                        >
                          {item.brand}
                        </span>
                      )}
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: cond.color }}
                      >
                        {cond.label}
                      </span>
                    </div>

                    {/* Seller */}
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 overflow-hidden flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ border: '1px solid #1a1040' }}
                      >
                        {item.seller_avatar ? (
                          <Image src={item.seller_avatar} alt={item.seller_name} width={20} height={20} className="object-cover w-full h-full" unoptimized />
                        ) : (
                          item.seller_name[0]?.toUpperCase()
                        )}
                      </div>
                      <span className="text-xs text-gray-500 truncate">{item.seller_name}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-auto pt-1">
                      <button
                        onClick={() => {
                          if (!currentUserId) { router.push('/auth'); return }
                          setChat(item)
                        }}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-transform hover:scale-[1.02]"
                        style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040' }}
                      >
                        💬 Satıcıya yaz
                      </button>
                      <button
                        onClick={() => removeItem(item)}
                        disabled={removing === item.basket_id}
                        className="flex-1 py-2 rounded-xl text-xs font-bold transition-all hover:bg-red-50 disabled:opacity-50"
                        style={{ border: '2px solid #1a1040', color: '#1a1040' }}
                      >
                        {removing === item.basket_id ? '...' : '✕ Çıxar'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {chat && currentUserId && (
        <ChatDrawer
          listingId={chat.listing_id}
          sellerId={chat.seller_id}
          sellerName={chat.seller_name}
          sellerAvatarUrl={chat.seller_avatar ?? undefined}
          listingTitle={chat.title_az}
          listingPrice={chat.price}
          listingImage={chat.images[0]}
          currentUserId={currentUserId}
          onClose={() => setChat(null)}
        />
      )}
    </>
  )
}
