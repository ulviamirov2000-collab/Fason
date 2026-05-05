'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { ListingRow, CommentRow } from '@/lib/supabase'
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

const conditionMap = {
  new:  { label: 'Yeni',  color: '#00856F', bg: '#E8FFF8', border: '#00E5CC' },
  good: { label: 'Yaxşı', color: '#B45309', bg: '#FFF8EC', border: '#FF9500' },
  fair: { label: 'Orta',  color: '#CC0044', bg: '#FFF0F5', border: '#FF2D78' },
}

const ADMIN_EMAIL = 'ulvi.amirov.2000@gmail.com'
const PHONE_RE = /(\+?\d[\d\s\-().]{6,}\d)/
const LINK_RE  = /https?:\/\/|www\.|\.com|\.az|t\.me|wa\.me|instagram\.com/i

const GENDER_LABELS: Record<string, string> = {
  qadin: 'Qadın', kisi: 'Kişi', usaq: 'Uşaq', el: 'Əl işi',
}

export default function ListingClient({ id }: { id: string }) {
  const router = useRouter()

  const [listing,       setListing]       = useState<FullListing | null>(null)
  const [activeImg,     setActiveImg]     = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [adminUserId,   setAdminUserId]   = useState<string | null>(null)

  const [chatOpen,         setChatOpen]         = useState(false)
  const [chatPrefilledMsg, setChatPrefilledMsg] = useState('')

  const [inBasket,      setInBasket]      = useState(false)
  const [basketLoading, setBasketLoading] = useState(false)
  const [basketCount,   setBasketCount]   = useState(0)

  const [messageCount, setMessageCount] = useState(0)

  const [comments,       setComments]       = useState<CommentWithUser[]>([])
  const [commentText,    setCommentText]    = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [commentWarning, setCommentWarning] = useState(false)

  useEffect(() => {
    supabase
      .from('users').select('id').eq('email', ADMIN_EMAIL).single()
      .then(({ data }) => { if (data) setAdminUserId(data.id) })
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
    })

    supabase
      .from('listings')
      .select('*, users:seller_id(id, full_name, email, avatar_url)')
      .eq('id', id).single()
      .then(({ data }) => {
        setListing(data as FullListing)
        setBasketCount((data as FullListing)?.basket_count ?? 0)
        setLoading(false)
      })

    supabase
      .from('messages').select('id', { count: 'exact', head: true }).eq('listing_id', id)
      .then(({ count }) => setMessageCount(count ?? 0))

    supabase
      .from('comments')
      .select('*, users:user_id(full_name, email, avatar_url)')
      .eq('listing_id', id).order('created_at', { ascending: true })
      .then(({ data }) => setComments((data ?? []) as CommentWithUser[]))
  }, [id])

  useEffect(() => {
    if (!currentUserId) { setInBasket(false); return }
    supabase
      .from('baskets').select('id').eq('user_id', currentUserId).eq('listing_id', id).maybeSingle()
      .then(({ data }) => setInBasket(!!data))
  }, [currentUserId, id])

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

  async function submitComment() {
    if (!currentUserId || !commentText.trim()) return
    if (PHONE_RE.test(commentText) || LINK_RE.test(commentText)) { setCommentWarning(true); return }
    setCommentLoading(true)
    const { data } = await supabase
      .from('comments')
      .insert({ listing_id: id, user_id: currentUserId, text: commentText.trim() })
      .select('*, users:user_id(full_name, email, avatar_url)').single()
    if (data) { setComments(c => [...c, data as CommentWithUser]); setCommentText('') }
    setCommentLoading(false)
    setCommentWarning(false)
  }

  async function deleteComment(commentId: string) {
    await supabase.from('comments').delete().eq('id', commentId)
    setComments(c => c.filter(x => x.id !== commentId))
  }

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-gray-400 text-sm">Yüklənir...</div>
      </main>
    )
  }

  if (!listing) {
    return (
      <main className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <p className="text-gray-600 font-semibold mb-1">Elan tapılmadı</p>
        <Link href="/" className="text-sm underline" style={{ color: '#FF2D78' }}>Ana səhifəyə qayıt</Link>
      </main>
    )
  }

  const cond       = conditionMap[listing.condition] ?? conditionMap.good
  const seller     = listing.users
  const sellerName = seller?.full_name || seller?.email?.split('@')[0] || 'Satıcı'
  const hasImages  = listing.images && listing.images.length > 0
  const subcategory: string | null = (listing as ListingRow & { subcategory?: string | null }).subcategory ?? null
  const color: string | null       = (listing as ListingRow & { color?: string | null }).color ?? null
  const gender: string | null      = (listing as ListingRow & { gender?: string | null }).gender ?? null
  const isSeller  = !!seller && currentUserId === seller.id
  const isActive  = listing.status === 'active'

  const specs: { label: string; value: string }[] = []
  if (gender && GENDER_LABELS[gender]) specs.push({ label: 'Kimə aiddir', value: GENDER_LABELS[gender] })
  if (listing.brand)  specs.push({ label: 'Brend',      value: listing.brand })
  if (listing.category) specs.push({ label: 'Kateqoriya', value: listing.category })
  if (subcategory)    specs.push({ label: 'Növ',        value: subcategory })
  if (listing.size)   specs.push({ label: 'Ölçü',       value: listing.size })
  if (color)          specs.push({ label: 'Rəng',       value: color })
  specs.push({ label: 'Vəziyyət', value: cond.label })

  return (
    <>
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-5 flex-wrap">
          <Link href="/" className="hover:underline">Ana səhifə</Link>
          {listing.category && (
            <>
              <span>/</span>
              <Link href={`/?cat=${listing.category}`} className="hover:underline" style={{ color: '#1a1040' }}>
                {listing.category}
              </Link>
            </>
          )}
          {subcategory && (
            <>
              <span>/</span>
              <span style={{ color: '#FF2D78' }}>{subcategory}</span>
            </>
          )}
        </nav>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">

          {/* ─ LEFT: Gallery ─ */}
          <div>
            <div className="flex gap-3">

              {/* Vertical thumbnail strip — desktop only */}
              {hasImages && listing.images.length > 1 && (
                <div className="hidden sm:flex flex-col gap-2 flex-shrink-0" style={{ width: 72 }}>
                  {listing.images.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className="relative rounded-xl overflow-hidden transition-all hover:opacity-80 flex-shrink-0"
                      style={{
                        width: 72, height: 90,
                        border: i === activeImg ? '2.5px solid #FF2D78' : '2px solid #e5e7eb',
                        boxShadow: i === activeImg ? '0 0 0 1px #FF2D78' : undefined,
                      }}
                    >
                      <Image src={src} alt={`Foto ${i + 1}`} fill className="object-cover" unoptimized />
                    </button>
                  ))}
                </div>
              )}

              {/* Main image */}
              <div
                className="relative flex-1 rounded-2xl overflow-hidden bg-gradient-to-br from-pink-50 to-yellow-50 flex items-center justify-center"
                style={{ aspectRatio: '3/4', maxHeight: 620, border: '2px solid #e5e7eb' }}
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

                {listing.status !== 'active' && (
                  <div
                    className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-bold text-white"
                    style={{
                      backgroundColor: listing.status === 'sold' ? '#FF2D78' : '#9ca3af',
                      border: '2px solid #1a1040',
                    }}
                  >
                    {listing.status === 'sold' ? '✓ Satıldı' : 'Arxiv'}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile thumbnail strip */}
            {hasImages && listing.images.length > 1 && (
              <div className="flex sm:hidden gap-2 mt-3 overflow-x-auto pb-1">
                {listing.images.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className="relative rounded-xl overflow-hidden flex-shrink-0"
                    style={{
                      width: 60, height: 76,
                      border: i === activeImg ? '2.5px solid #FF2D78' : '2px solid #e5e7eb',
                    }}
                  >
                    <Image src={src} alt={`Foto ${i + 1}`} fill className="object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}

            {/* Social proof — desktop, under gallery */}
            {((listing.views ?? 0) > 0 || basketCount > 0 || messageCount > 0) && (
              <div className="hidden lg:flex items-center gap-5 mt-5 text-xs text-gray-400">
                {(listing.views ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    {listing.views} baxış
                  </span>
                )}
                {basketCount > 0 && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    {basketCount} nəfər bəyənib
                  </span>
                )}
                {messageCount > 0 && (
                  <span className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    {messageCount} mesaj
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ─ RIGHT: Info + CTA + Seller ─ */}
          <div className="flex flex-col gap-5">

            {/* Title */}
            <div>
              <h1
                className="text-xl sm:text-2xl font-bold leading-snug"
                style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
              >
                {listing.title_az}
              </h1>
              {listing.title_ru && listing.title_ru !== listing.title_az && (
                <p className="text-sm text-gray-400 mt-1">{listing.title_ru}</p>
              )}
            </div>

            {/* Price row */}
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="text-4xl font-black"
                style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
              >
                {listing.price} ₼
              </span>
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: cond.bg, color: cond.color, border: `1.5px solid ${cond.border}` }}
              >
                {cond.label}
              </span>
            </div>

            {/* Mobile social proof */}
            {((listing.views ?? 0) > 0 || basketCount > 0) && (
              <div className="flex lg:hidden items-center gap-4 text-xs text-gray-400">
                {(listing.views ?? 0) > 0 && <span>👁 {listing.views} baxış</span>}
                {basketCount > 0 && <span>♥ {basketCount} bəyənib</span>}
              </div>
            )}

            {/* Key chips: size, color, brand */}
            {(listing.size || color || listing.brand) && (
              <div className="flex flex-wrap gap-2">
                {listing.size && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold"
                    style={{ border: '2px solid #1a1040', backgroundColor: '#FFE600', color: '#1a1040' }}
                  >
                    📏 {listing.size}
                  </div>
                )}
                {color && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
                    style={{ border: '2px solid #e5e7eb', backgroundColor: 'white', color: '#1a1040' }}
                  >
                    🎨 {color}
                  </div>
                )}
                {listing.brand && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
                    style={{ border: '2px solid #e5e7eb', backgroundColor: 'white', color: '#1a1040' }}
                  >
                    ✦ {listing.brand}
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {listing.description_az && (
              <div
                className="p-4 rounded-2xl text-sm text-gray-700 leading-relaxed"
                style={{ backgroundColor: '#FAF7F2', border: '1.5px solid #e5e7eb' }}
              >
                {listing.description_az}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col gap-2.5">
              {!isSeller && isActive && (
                <Link
                  href={`/order/${id}`}
                  className="w-full py-4 rounded-2xl font-bold text-white text-center text-base transition-transform hover:scale-[1.01] active:scale-[0.99]"
                  style={{
                    backgroundColor: '#FF2D78',
                    border: '2px solid #1a1040',
                    boxShadow: '3px 3px 0 #1a1040',
                    display: 'block',
                  }}
                >
                  ✦ İndi al · {listing.price} ₼
                </Link>
              )}

              {/* Basket / Save */}
              <button
                onClick={toggleBasket}
                disabled={basketLoading}
                className="w-full py-3.5 rounded-2xl font-bold text-center transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  border: '2px solid #1a1040',
                  backgroundColor: inBasket ? '#FFF0F5' : 'white',
                  color: inBasket ? '#FF2D78' : '#1a1040',
                  boxShadow: '3px 3px 0 #1a1040',
                }}
              >
                {inBasket ? (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#FF2D78"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                    Sevilmişlərə əlavə edildi
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                    Sevilmişlərə əlavə et
                  </>
                )}
              </button>

              {!isSeller && adminUserId && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!currentUserId) { router.push('/auth'); return }
                      setChatPrefilledMsg('')
                      setChatOpen(true)
                    }}
                    className="flex-1 py-3 rounded-2xl font-semibold text-center transition-all hover:bg-gray-50 text-sm"
                    style={{ border: '2px solid #1a1040', color: '#1a1040' }}
                  >
                    💬 Adminə yaz
                  </button>
                  <button
                    onClick={() => {
                      if (!currentUserId) { router.push('/auth'); return }
                      setChatPrefilledMsg(`Salam! "${listing.title_az}" elanı ilə bağlı sualım var.`)
                      setChatOpen(true)
                    }}
                    className="py-3 px-5 rounded-2xl font-semibold text-center transition-all hover:bg-gray-50 text-sm"
                    style={{ border: '2px solid #1a1040', color: '#1a1040' }}
                    title="Kömək"
                  >
                    ❓
                  </button>
                </div>
              )}
            </div>

            {/* Seller card */}
            {seller && (
              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '2px solid #1a1040', boxShadow: '3px 3px 0 #1a1040' }}
              >
                <div
                  className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider"
                  style={{ backgroundColor: '#1a1040', color: '#FFE600' }}
                >
                  Satıcı
                </div>
                <div className="p-4 bg-white flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 overflow-hidden flex items-center justify-center text-lg font-bold text-white flex-shrink-0"
                    style={{ border: '2px solid #1a1040' }}
                  >
                    {seller.avatar_url ? (
                      <Image
                        src={seller.avatar_url}
                        alt={sellerName}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                        unoptimized
                      />
                    ) : sellerName[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: '#1a1040' }}>{sellerName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">FASON satıcısı</p>
                  </div>
                  <Link
                    href={`/profile/${seller.id}`}
                    className="text-xs font-bold px-4 py-2 rounded-xl transition-all hover:opacity-80 flex-shrink-0"
                    style={{ backgroundColor: '#FFE600', border: '2px solid #1a1040', color: '#1a1040' }}
                  >
                    Profil →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Product specs table ── */}
        {specs.length > 0 && (
          <div className="mt-12">
            <h2
              className="text-base font-bold mb-4"
              style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
            >
              Məhsul haqqında
            </h2>
            <div className="rounded-2xl overflow-hidden" style={{ border: '2px solid #1a1040' }}>
              {specs.map((spec, i) => (
                <div
                  key={spec.label}
                  className="flex items-center px-5 py-3.5 text-sm gap-4"
                  style={{
                    backgroundColor: i % 2 === 0 ? '#FAF7F2' : 'white',
                    borderBottom: i < specs.length - 1 ? '1px solid #e5e7eb' : 'none',
                  }}
                >
                  <span className="text-gray-400 flex-shrink-0" style={{ minWidth: 140 }}>{spec.label}</span>
                  <span className="font-semibold" style={{ color: '#1a1040' }}>{spec.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Comments ── */}
        <div className="mt-12">
          <h2
            className="text-base font-bold mb-5"
            style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
          >
            Şərhlər
            <span className="text-gray-400 font-normal text-sm ml-2">({comments.length})</span>
          </h2>

          {comments.length === 0 && (
            <p className="text-sm text-gray-400 mb-5">Hələ şərh yoxdur. İlk şərhi siz yazın!</p>
          )}

          <div className="flex flex-col gap-3 mb-6">
            {comments.map(c => {
              const uName = c.users?.full_name || c.users?.email?.split('@')[0] || 'İstifadəçi'
              return (
                <div
                  key={c.id}
                  className="flex gap-3 p-4 rounded-2xl"
                  style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}
                >
                  <div
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ border: '1.5px solid #1a1040' }}
                  >
                    {c.users?.avatar_url ? (
                      <Image
                        src={c.users.avatar_url}
                        alt={uName}
                        width={36}
                        height={36}
                        className="object-cover w-full h-full rounded-full"
                        unoptimized
                      />
                    ) : uName[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold" style={{ color: '#1a1040' }}>{uName}</span>
                      <span className="text-xs text-gray-300">
                        {new Date(c.created_at).toLocaleDateString('az-AZ')}
                      </span>
                      {currentUserId === c.user_id && (
                        <button
                          onClick={() => deleteComment(c.id)}
                          className="text-xs text-gray-300 hover:text-red-400 ml-auto"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mt-1 leading-relaxed">{c.text}</p>
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
                className="self-end px-6 py-2.5 rounded-full font-bold text-white text-sm disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040' }}
              >
                {commentLoading ? '...' : 'Göndər'}
              </button>
            </div>
          ) : (
            <Link href="/auth" className="text-sm font-semibold underline" style={{ color: '#FF2D78' }}>
              Şərh yazmaq üçün daxil olun
            </Link>
          )}
        </div>
      </main>

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
    </>
  )
}
