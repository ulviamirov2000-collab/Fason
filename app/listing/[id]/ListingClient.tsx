'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { ListingRow, OfferRow, CommentRow } from '@/lib/supabase'
import ChatDrawer from '@/components/ChatDrawer'

type FullListing = ListingRow & {
  users: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

type CommentWithUser = CommentRow & {
  users: { full_name: string | null; email: string | null; avatar_url: string | null } | null
}

type OfferWithBuyer = OfferRow & {
  users: { full_name: string | null; email: string | null; avatar_url: string | null } | null
}

const conditionMap = {
  new:  { label: 'Yeni',  color: '#00E5CC' },
  good: { label: 'Yaxşı', color: '#FF9500' },
  fair: { label: 'Orta',  color: '#FF2D78' },
}

const ADMIN_EMAIL = 'ulvi.amirov.2000@gmail.com'

const PHONE_RE = /(\+?\d[\d\s\-().]{6,}\d)/
const LINK_RE  = /https?:\/\/|www\.|\.com|\.az|t\.me|wa\.me|instagram\.com/i

export default function ListingClient({ id }: { id: string }) {
  const router = useRouter()

  const [listing,       setListing]       = useState<FullListing | null>(null)
  const [activeImg,     setActiveImg]     = useState(0)
  const [loading,         setLoading]         = useState(true)
  const [currentUserId,   setCurrentUserId]   = useState<string | null>(null)
  const [currentUserName, setCurrentUserName] = useState<string>('İstifadəçi')
  const [adminUserId,     setAdminUserId]     = useState<string | null>(null)

  // Chat with admin
  const [chatOpen,         setChatOpen]         = useState(false)
  const [chatPrefilledMsg, setChatPrefilledMsg] = useState('')

  // Basket
  const [inBasket,      setInBasket]      = useState(false)
  const [basketLoading, setBasketLoading] = useState(false)
  const [basketCount,   setBasketCount]   = useState(0)

  // Social proof
  const [messageCount, setMessageCount] = useState(0)

  // Offer modal (buyer)
  const [showOfferModal, setShowOfferModal] = useState(false)
  const [offerPrice,     setOfferPrice]     = useState('')
  const [offerLoading,   setOfferLoading]   = useState(false)
  const [offerSent,      setOfferSent]      = useState(false)

  // Buyer's existing offer
  const [myOffer, setMyOffer] = useState<OfferRow | null>(null)

  // Seller incoming offers panel
  const [sellerOffers,       setSellerOffers]       = useState<OfferWithBuyer[]>([])
  const [counterInputs,      setCounterInputs]      = useState<Record<string, string>>({})
  const [offerActionLoading, setOfferActionLoading] = useState<string | null>(null)

  // Comments
  const [comments,       setComments]       = useState<CommentWithUser[]>([])
  const [commentText,    setCommentText]    = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentWarning, setCommentWarning] = useState(false)

  // Fetch admin user ID once
  useEffect(() => {
    supabase
      .from('users')
      .select('id')
      .eq('email', ADMIN_EMAIL)
      .single()
      .then(({ data }) => { if (data) setAdminUserId(data.id) })
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
      if (data.user) {
        const name = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'İstifadəçi'
        setCurrentUserName(name)
      }
    })

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

    supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', id)
      .then(({ count }) => setMessageCount(count ?? 0))

    // Load comments
    supabase
      .from('comments')
      .select('*, users:user_id(full_name, email, avatar_url)')
      .eq('listing_id', id)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments((data ?? []) as CommentWithUser[]))
  }, [id])

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

  // Buyer's offer
  useEffect(() => {
    if (!currentUserId) { setMyOffer(null); return }
    supabase
      .from('offers')
      .select('*')
      .eq('listing_id', id)
      .eq('buyer_id', currentUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setMyOffer(data as OfferRow | null))
  }, [currentUserId, id])

  // Seller: load incoming offers
  useEffect(() => {
    if (!currentUserId || !listing) return
    if (currentUserId !== listing.users?.id) return
    supabase
      .from('offers')
      .select('*, users:buyer_id(full_name, email, avatar_url)')
      .eq('listing_id', id)
      .in('status', ['pending', 'countered'])
      .order('created_at', { ascending: false })
      .then(({ data }) => setSellerOffers((data ?? []) as OfferWithBuyer[]))
  }, [currentUserId, id, listing])

  async function toggleBasket() {
    if (!currentUserId) { router.push('/auth'); return }
    setBasketLoading(true)

    if (inBasket) {
      await supabase.from('baskets').delete().eq('user_id', currentUserId).eq('listing_id', id)
      await supabase.from('listings').update({ basket_count: Math.max(0, basketCount - 1) }).eq('id', id)
      setInBasket(false)
      setBasketCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('baskets').insert({ user_id: currentUserId, listing_id: id })
      await supabase.from('listings').update({ basket_count: basketCount + 1 }).eq('id', id)
      setInBasket(true)
      setBasketCount(c => c + 1)
    }

    window.dispatchEvent(new CustomEvent('basket-changed'))
    setBasketLoading(false)
  }

  async function submitOffer() {
    if (!currentUserId || !listing?.users) return
    const price = parseFloat(offerPrice)
    if (!price || price <= 0 || price > listing.price) return

    setOfferLoading(true)

    const { data: offer, error } = await supabase
      .from('offers')
      .insert({
        listing_id:    id,
        buyer_id:      currentUserId,
        seller_id:     listing.users.id,
        offered_price: price,
        status:        'pending',
      })
      .select()
      .single()

    if (!error && offer) {
      const sellerId = listing.users.id
      if (!sellerId) {
        console.warn('[submitOffer] sellerId is null — cannot notify')
      } else {
        // Notify seller
        const { data: notifData, error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id:  sellerId,
            type:     'offer_received',
            title:    `💰 ${currentUserName} ${price} ₼ təklif etdi`,
            body:     listing.title_az,
            link:     `/listing/${id}`,
            is_read:  false,
          })
          .select()
          .single()
        console.log('[submitOffer] seller notif:', { notifData, notifError, sellerId })
      }

      // System message to admin about new offer
      if (adminUserId && currentUserId) {
        const { error: msgError } = await supabase.from('messages').insert({
          listing_id:  id,
          sender_id:   currentUserId,
          receiver_id: adminUserId,
          text:        `💰 Yeni təklif: ${currentUserName} → "${listing.title_az}" üçün ${price} ₼ təklif etdi`,
          is_read:     false,
        })
        console.log('[submitOffer] admin message:', { msgError })
      }

      window.dispatchEvent(new CustomEvent('notif-changed'))
      setMyOffer(offer as OfferRow)
    }

    setOfferLoading(false)
    setOfferSent(true)
  }

  async function acceptOffer(offer: OfferWithBuyer) {
    setOfferActionLoading(offer.id)
    await supabase.from('offers').update({ status: 'accepted' }).eq('id', offer.id)
    const { data: nd, error: ne } = await supabase.from('notifications').insert({
      user_id:  offer.buyer_id,
      type:     'offer_accepted',
      title:    `✓ Satıcı ${offer.offered_price} ₼ qəbul etdi — Al düyməsinə basın`,
      body:     listing?.title_az ?? '',
      link:     `/listing/${id}`,
      is_read:  false,
    }).select().single()
    console.log('[acceptOffer] notif:', { nd, ne, buyerId: offer.buyer_id })
    window.dispatchEvent(new CustomEvent('notif-changed'))
    setSellerOffers(s => s.filter(o => o.id !== offer.id))
    setOfferActionLoading(null)
  }

  async function rejectOffer(offer: OfferWithBuyer) {
    setOfferActionLoading(offer.id)
    await supabase.from('offers').update({ status: 'rejected' }).eq('id', offer.id)
    const { data: nd, error: ne } = await supabase.from('notifications').insert({
      user_id:  offer.buyer_id,
      type:     'offer_rejected',
      title:    `✗ Satıcı təklifinizi rədd etdi — ${listing?.title_az ?? ''}`,
      body:     'Yeni qiymət təklif edə bilərsiniz.',
      link:     `/listing/${id}`,
      is_read:  false,
    }).select().single()
    console.log('[rejectOffer] notif:', { nd, ne, buyerId: offer.buyer_id })
    window.dispatchEvent(new CustomEvent('notif-changed'))
    setSellerOffers(s => s.filter(o => o.id !== offer.id))
    setOfferActionLoading(null)
  }

  async function counterOffer(offer: OfferWithBuyer) {
    const counterPrice = parseFloat(counterInputs[offer.id] ?? '')
    if (!counterPrice || counterPrice <= 0) return
    setOfferActionLoading(offer.id)
    await supabase.from('offers').update({ status: 'countered', counter_price: counterPrice }).eq('id', offer.id)
    const { data: nd, error: ne } = await supabase.from('notifications').insert({
      user_id:  offer.buyer_id,
      type:     'offer_countered',
      title:    `↩ Satıcı ${counterPrice} ₼ əks-təklif verdi`,
      body:     listing?.title_az ?? '',
      link:     `/listing/${id}`,
      is_read:  false,
    }).select().single()
    console.log('[counterOffer] notif:', { nd, ne, buyerId: offer.buyer_id })
    window.dispatchEvent(new CustomEvent('notif-changed'))
    setSellerOffers(s => s.filter(o => o.id !== offer.id))
    setOfferActionLoading(null)
  }

  async function submitComment() {
    if (!currentUserId || !commentText.trim()) return
    const isSuspicious = PHONE_RE.test(commentText) || LINK_RE.test(commentText)
    if (isSuspicious) { setCommentWarning(true); return }

    setCommentLoading(true)
    const { data } = await supabase
      .from('comments')
      .insert({ listing_id: id, user_id: currentUserId, text: commentText.trim() })
      .select('*, users:user_id(full_name, email, avatar_url)')
      .single()

    if (data) {
      setComments(c => [...c, data as CommentWithUser])
      setCommentText('')
    }
    setCommentLoading(false)
    setCommentWarning(false)
  }

  async function deleteComment(commentId: string) {
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(c => c.filter(x => x.id !== commentId))
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

  const cond        = conditionMap[listing.condition] ?? conditionMap.good
  const seller      = listing.users
  const sellerName  = seller?.full_name || seller?.email?.split('@')[0] || 'Satıcı'
  const hasImages   = listing.images && listing.images.length > 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subcategory: string | null = (listing as any).subcategory ?? null
  const isSeller    = !!seller && currentUserId === seller.id
  const isActive    = listing.status === 'active'

  const socialParts: string[] = []
  if ((listing.views ?? 0) > 0) socialParts.push(`👁 ${listing.views} baxış`)
  if (basketCount > 0)          socialParts.push(`🛒 ${basketCount} səbətdə`)
  if (messageCount > 0)         socialParts.push(`💬 ${messageCount} mesaj`)

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
                <Image src={listing.images[activeImg]} alt={listing.title_az} fill className="object-cover" unoptimized />
              ) : (
                <span className="text-8xl">👗</span>
              )}
              {listing.status !== 'active' && (
                <div
                  className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: listing.status === 'sold' ? '#3b82f6' : '#9ca3af' }}
                >
                  {listing.status === 'sold' ? 'Satıldı' : 'Arxiv'}
                </div>
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
            {listing.category && (
              <p className="text-xs text-gray-400 font-medium">
                {listing.category}
                {subcategory && <span> › <span style={{ color: '#FF2D78' }}>{subcategory}</span></span>}
              </p>
            )}

            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}>
                {listing.title_az}
              </h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <div
                  className="inline-block px-4 py-1.5 rounded-full text-xl font-bold text-black"
                  style={{ backgroundColor: '#FFE600', border: '2px solid #1a1040' }}
                >
                  {listing.price} ₼
                </div>
                {myOffer && myOffer.status === 'accepted' && (
                  <div
                    className="inline-block px-3 py-1 rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: '#10b981', border: '2px solid #1a1040' }}
                  >
                    ✓ Təklifiniz qəbul edildi: {myOffer.offered_price} ₼
                  </div>
                )}
                {myOffer && myOffer.status === 'countered' && myOffer.counter_price && (
                  <div
                    className="inline-block px-3 py-1 rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: '#FF9800', border: '2px solid #1a1040' }}
                  >
                    Əks-təklif: {myOffer.counter_price} ₼
                  </div>
                )}
              </div>
            </div>

            {socialParts.length > 0 && (
              <p className="text-xs text-gray-400">{socialParts.join(' · ')}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {listing.brand && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}>
                  {listing.brand}
                </span>
              )}
              {listing.size && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}>
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

            {listing.description_az && (
              <p className="text-sm text-gray-700 leading-relaxed">{listing.description_az}</p>
            )}

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
                  <p className="font-semibold text-sm truncate" style={{ color: '#1a1040' }}>{sellerName}</p>
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
              {/* "Al" — shown to buyer when active */}
              {!isSeller && isActive && (
                <Link
                  href={`/order/${id}${myOffer && (myOffer.status === 'accepted' || myOffer.status === 'countered') ? `?offer=${myOffer.id}` : ''}`}
                  className="w-full py-3.5 rounded-2xl font-bold text-white text-center transition-transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: '#10b981', border: '2px solid #1a1040', boxShadow: '3px 3px 0 #1a1040', display: 'block' }}
                >
                  🛍 Al {myOffer && myOffer.status === 'accepted' ? `· ${myOffer.offered_price} ₼` : myOffer?.status === 'countered' && myOffer.counter_price ? `· ${myOffer.counter_price} ₼` : `· ${listing.price} ₼`}
                </Link>
              )}

              {/* Offer button — only when active, not seller, no pending/accepted offer yet */}
              {!isSeller && isActive && (!myOffer || myOffer.status === 'rejected') && (
                <button
                  onClick={() => {
                    if (!currentUserId) { router.push('/auth'); return }
                    setShowOfferModal(true)
                  }}
                  className="w-full py-3.5 rounded-2xl font-bold text-center transition-all hover:bg-gray-50"
                  style={{ border: '2px solid #1a1040', color: '#1a1040', boxShadow: '3px 3px 0 #1a1040' }}
                >
                  💰 Qiymət təklif et
                </button>
              )}

              {myOffer && myOffer.status === 'pending' && (
                <div
                  className="w-full py-3 rounded-2xl text-center text-sm font-semibold"
                  style={{ backgroundColor: '#FFF8E1', border: '2px solid #FFE600', color: '#795548' }}
                >
                  ⏳ Təklifiniz ({myOffer.offered_price} ₼) satıcının cavabı gözlənilir
                </div>
              )}

              {/* Admin chat + Help — only for non-sellers */}
              {!isSeller && adminUserId && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!currentUserId) { router.push('/auth'); return }
                      setChatPrefilledMsg('')
                      setChatOpen(true)
                    }}
                    className="flex-1 py-3 rounded-2xl font-bold text-center transition-all hover:bg-gray-50"
                    style={{ border: '2px solid #1a1040', color: '#1a1040', boxShadow: '3px 3px 0 #1a1040', fontSize: '13px' }}
                  >
                    💬 Adminə yaz
                  </button>
                  <button
                    onClick={() => {
                      if (!currentUserId) { router.push('/auth'); return }
                      setChatPrefilledMsg(`Salam! "${listing.title_az}" elanı ilə bağlı sualım var.`)
                      setChatOpen(true)
                    }}
                    className="py-3 px-4 rounded-2xl font-bold text-center transition-all hover:bg-gray-50"
                    style={{ border: '2px solid #1a1040', color: '#1a1040', boxShadow: '3px 3px 0 #1a1040', fontSize: '13px' }}
                  >
                    ❓ Kömək
                  </button>
                </div>
              )}

              {/* Basket */}
              <button
                onClick={toggleBasket}
                disabled={basketLoading}
                className="w-full py-3.5 rounded-2xl font-bold text-center transition-all hover:bg-gray-50 disabled:opacity-60"
                style={{ border: '2px solid #1a1040', color: '#1a1040', boxShadow: '3px 3px 0 #1a1040' }}
              >
                {inBasket ? '🛒 Səbətdən çıxar' : '🛒 Səbətə at'}
              </button>
            </div>

            {/* Seller: incoming offers panel */}
            {isSeller && sellerOffers.length > 0 && (
              <div className="flex flex-col gap-3 mt-2">
                <p className="text-sm font-bold" style={{ color: '#1a1040' }}>📬 Gələn təkliflər ({sellerOffers.length})</p>
                {sellerOffers.map(offer => {
                  const buyerName = offer.users?.full_name || offer.users?.email?.split('@')[0] || 'Alıcı'
                  const isLoading = offerActionLoading === offer.id
                  return (
                    <div
                      key={offer.id}
                      className="rounded-2xl p-4 flex flex-col gap-3"
                      style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold" style={{ color: '#1a1040' }}>{buyerName}</span>
                        <span
                          className="text-lg font-bold px-3 py-0.5 rounded-full"
                          style={{ backgroundColor: '#FFE600', border: '1.5px solid #1a1040' }}
                        >
                          {offer.offered_price} ₼
                        </span>
                      </div>
                      {offer.status === 'countered' && (
                        <p className="text-xs text-orange-600">Əks-təklifiniz: {offer.counter_price} ₼</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptOffer(offer)}
                          disabled={isLoading}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                          style={{ backgroundColor: '#10b981', border: '1.5px solid #1a1040' }}
                        >
                          ✓ Qəbul et
                        </button>
                        <button
                          onClick={() => rejectOffer(offer)}
                          disabled={isLoading}
                          className="flex-1 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                          style={{ backgroundColor: '#ef4444', border: '1.5px solid #1a1040' }}
                        >
                          ✕ Rədd et
                        </button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min={1}
                          placeholder="Əks-təklif ₼"
                          value={counterInputs[offer.id] ?? ''}
                          onChange={e => setCounterInputs(p => ({ ...p, [offer.id]: e.target.value }))}
                          className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                          style={{ border: '1.5px solid #1a1040' }}
                        />
                        <button
                          onClick={() => counterOffer(offer)}
                          disabled={isLoading || !counterInputs[offer.id]}
                          className="py-2 px-3 rounded-xl text-xs font-bold text-white disabled:opacity-50"
                          style={{ backgroundColor: '#FF9800', border: '1.5px solid #1a1040' }}
                        >
                          Göndər
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Comments section */}
        <div className="mt-10">
          <h2 className="text-base font-bold mb-4" style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}>
            💬 Şərhlər ({comments.length})
          </h2>

          {comments.length === 0 && (
            <p className="text-sm text-gray-400 mb-4">Hələ şərh yoxdur. İlk şərhi siz yazın!</p>
          )}

          <div className="flex flex-col gap-3 mb-6">
            {comments.map(c => {
              const uName = c.users?.full_name || c.users?.email?.split('@')[0] || 'İstifadəçi'
              const canDelete = currentUserId === c.user_id
              return (
                <div
                  key={c.id}
                  className="flex gap-3 p-3 rounded-2xl"
                  style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}
                >
                  <div
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ border: '1.5px solid #1a1040' }}
                  >
                    {c.users?.avatar_url ? (
                      <Image src={c.users.avatar_url} alt={uName} width={32} height={32} className="object-cover w-full h-full rounded-full" unoptimized />
                    ) : (
                      uName[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold" style={{ color: '#1a1040' }}>{uName}</span>
                      <span className="text-xs text-gray-300">{new Date(c.created_at).toLocaleDateString('az-AZ')}</span>
                      {canDelete && (
                        <button onClick={() => deleteComment(c.id)} className="text-xs text-gray-300 hover:text-red-400 ml-auto">✕</button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5">{c.text}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {currentUserId ? (
            <div className="flex flex-col gap-2">
              <textarea
                rows={2}
                value={commentText}
                onChange={e => { setCommentText(e.target.value); setCommentWarning(false) }}
                placeholder="Şərhinizi yazın..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
              />
              {commentWarning && (
                <p className="text-xs" style={{ color: '#FF2D78' }}>
                  Şərhdə telefon nömrəsi və ya xarici link qadağandır.
                </p>
              )}
              <button
                onClick={submitComment}
                disabled={commentLoading || !commentText.trim()}
                className="self-end px-6 py-2 rounded-full font-bold text-white text-sm disabled:opacity-50"
                style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040' }}
              >
                {commentLoading ? '...' : 'Göndər'}
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="text-sm font-semibold underline"
              style={{ color: '#FF2D78' }}
            >
              Şərh yazmaq üçün daxil olun
            </Link>
          )}
        </div>
      </main>

      {/* Chat with Admin drawer */}
      {chatOpen && adminUserId && currentUserId && (
        <ChatDrawer
          listingId={listing.id}
          sellerId={adminUserId}
          sellerName="FASON Admin"
          listingTitle={listing.title_az}
          listingPrice={listing.price}
          listingImage={hasImages ? listing.images[0] : undefined}
          currentUserId={currentUserId}
          initialMessage={chatPrefilledMsg}
          onClose={() => { setChatOpen(false); setChatPrefilledMsg('') }}
        />
      )}

      {/* Offer modal */}
      {showOfferModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowOfferModal(false); setOfferSent(false); setOfferPrice('') } }}
        >
          <div
            className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4"
            style={{ backgroundColor: 'white', border: '2px solid #1a1040', boxShadow: '4px 4px 0 #1a1040' }}
          >
            {offerSent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="text-4xl">✅</div>
                <p className="font-bold text-base" style={{ color: '#1a1040' }}>Təklifiniz göndərildi!</p>
                <p className="text-sm text-gray-500">Satıcı cavab verdikdə bildiriş alacaqsınız.</p>
                <button
                  onClick={() => { setShowOfferModal(false); setOfferSent(false); setOfferPrice('') }}
                  className="mt-2 px-6 py-2 rounded-full font-bold text-white"
                  style={{ backgroundColor: '#FF2D78' }}
                >
                  Bağla
                </button>
              </div>
            ) : (
              <>
                <div>
                  <h3 className="font-bold text-base" style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}>
                    💰 Qiymət təklif et
                  </h3>
                  <p className="text-xs text-gray-400 mt-1">Satıcı qiymətindən aşağı: {listing.price} ₼</p>
                </div>

                <div
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                  style={{ border: '2px solid #1a1040' }}
                >
                  <span className="text-2xl font-bold" style={{ color: '#FF2D78' }}>₼</span>
                  <input
                    type="number"
                    min={1}
                    max={listing.price}
                    value={offerPrice}
                    onChange={e => setOfferPrice(e.target.value)}
                    placeholder="Təklif qiymətiniz"
                    className="flex-1 text-2xl font-bold outline-none bg-transparent"
                    style={{ color: '#1a1040' }}
                    autoFocus
                  />
                </div>

                {offerPrice && parseFloat(offerPrice) > listing.price && (
                  <p className="text-xs" style={{ color: '#FF2D78' }}>
                    Təklif satış qiymətindən ({listing.price} ₼) çox ola bilməz
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowOfferModal(false); setOfferPrice('') }}
                    className="flex-1 py-3 rounded-2xl font-semibold text-sm transition-all hover:bg-gray-50"
                    style={{ border: '2px solid #ccc', color: '#666' }}
                  >
                    İmtina
                  </button>
                  <button
                    onClick={submitOffer}
                    disabled={offerLoading || !offerPrice || parseFloat(offerPrice) <= 0 || parseFloat(offerPrice) > listing.price}
                    className="flex-1 py-3 rounded-2xl font-bold text-white text-sm transition-transform hover:scale-[1.02] disabled:opacity-50"
                    style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040' }}
                  >
                    {offerLoading ? '...' : 'Göndər'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
