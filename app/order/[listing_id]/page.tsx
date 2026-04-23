'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { ListingRow } from '@/lib/supabase'

type FullListing = ListingRow & {
  users: { id: string; full_name: string | null; email: string | null } | null
}

export default function OrderPage({ params }: { params: Promise<{ listing_id: string }> }) {
  const router = useRouter()

  const [listingId, setListingId] = useState<string | null>(null)
  useEffect(() => { params.then(p => setListingId(p.listing_id)) }, [params])

  const [listing,       setListing]       = useState<FullListing | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [submitting,    setSubmitting]    = useState(false)
  const [done,          setDone]          = useState(false)
  const [orderId,       setOrderId]       = useState<string | null>(null)

  const [form, setForm] = useState({
    delivery: false,
    address:  '',
    phone:    '+994',
    note:     '',
  })

  useEffect(() => {
    if (!listingId) return

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/auth'); return }
      setCurrentUserId(data.user.id)
    })

    supabase
      .from('listings')
      .select('*, users:seller_id(id, full_name, email)')
      .eq('id', listingId).single()
      .then(({ data }) => {
        setListing(data as FullListing)
        setLoading(false)
      })
  }, [listingId, router])

  async function submitOrder() {
    if (!currentUserId || !listing?.users) return
    if (form.delivery && !form.address.trim()) return
    if (!form.phone || form.phone === '+994') return

    setSubmitting(true)

    const { data: orderData } = await supabase.from('orders').insert({
      listing_id:       listing.id,
      buyer_id:         currentUserId,
      seller_id:        listing.users.id,
      offer_id:         null,
      status:           'pending',
      final_price:      listing.price,
      delivery_needed:  form.delivery,
      delivery_address: form.delivery ? form.address.trim() : null,
      phone:            form.phone.trim(),
      note:             form.note.trim() || null,
      is_seen:          false,
    }).select('id').single()

    setOrderId(orderData?.id ?? null)
    setSubmitting(false)
    setDone(true)
  }

  if (loading || !listingId) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-gray-400 text-sm">Yüklənir...</div>
      </main>
    )
  }

  if (!listing) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">Elan tapılmadı</p>
        <Link href="/" className="text-sm underline mt-2 block" style={{ color: '#FF2D78' }}>Ana səhifə</Link>
      </main>
    )
  }

  const sellerName = listing.users?.full_name || listing.users?.email?.split('@')[0] || 'Satıcı'

  if (done) {
    return (
      <main className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center gap-5 text-center">
        <div className="text-6xl">🎉</div>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}>
          Sifarişiniz qəbul edildi!
        </h1>
        <p className="text-sm text-gray-500 max-w-xs">
          Operator ən qısa zamanda sizinlə {form.phone} nömrəsi ilə əlaqə saxlayacaq.
        </p>
        <div
          className="w-full rounded-2xl p-4 text-left flex flex-col gap-2"
          style={{ backgroundColor: '#FAF7F2', border: '2px solid #1a1040' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#1a1040' }}>{listing.title_az}</p>
          <p className="text-lg font-bold" style={{ color: '#FF2D78' }}>{listing.price} ₼</p>
          {form.delivery && <p className="text-xs text-gray-500">📦 Kuryer: {form.address}</p>}
        </div>
        <button
          onClick={async () => {
            const { data: adminData } = await supabase
              .from('users').select('id').eq('email', 'ulvi.amirov.2000@gmail.com').single()
            if (adminData && currentUserId) {
              await supabase.from('messages').insert({
                listing_id:  listing.id,
                sender_id:   currentUserId,
                receiver_id: adminData.id,
                text:        `Salam, ${listing.title_az} üçün sifariş verdim. Sifariş №: ${orderId ?? '—'}`,
                is_read:     false,
              })
            }
            router.push('/messages')
          }}
          className="w-full py-3 rounded-2xl font-bold text-white"
          style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040', boxShadow: '3px 3px 0 #1a1040' }}
        >
          💬 Adminlə əlaqə saxla
        </button>
        <Link href="/" className="text-sm underline" style={{ color: '#9ca3af' }}>
          Ana səhifəyə qayıt
        </Link>
      </main>
    )
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <Link href={`/listing/${listingId}`} className="text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6 block">
        ← Elana qayıt
      </Link>

      <h1 className="text-xl font-bold mb-6" style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}>
        ✦ Sifariş ver
      </h1>

      {/* Listing summary */}
      <div className="flex gap-4 p-4 rounded-2xl mb-6" style={{ backgroundColor: 'white', border: '2px solid #1a1040' }}>
        <div className="relative w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100" style={{ border: '1.5px solid #e5e7eb' }}>
          {listing.images[0] ? (
            <Image src={listing.images[0]} alt={listing.title_az} fill className="object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">👗</div>
          )}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <p className="font-semibold text-sm truncate" style={{ color: '#1a1040' }}>{listing.title_az}</p>
          <p className="text-xs text-gray-500">Satıcı: {sellerName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="px-3 py-0.5 rounded-full text-sm font-bold text-black"
              style={{ backgroundColor: '#FFE600', border: '1.5px solid #1a1040' }}
            >
              {listing.price} ₼
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* Delivery toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl" style={{ backgroundColor: 'white', border: '2px solid #1a1040' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: '#1a1040' }}>📦 Kuryer lazımdır?</p>
            <p className="text-xs text-gray-400 mt-0.5">Çatdırılma xidməti</p>
          </div>
          <button
            onClick={() => setForm(f => ({ ...f, delivery: !f.delivery }))}
            className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
            style={{ backgroundColor: form.delivery ? '#FF2D78' : '#d1d5db' }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
              style={{ left: form.delivery ? '26px' : '2px' }}
            />
          </button>
        </div>

        {form.delivery && (
          <div>
            <label className="text-sm font-semibold mb-2 block" style={{ color: '#1a1040' }}>
              Çatdırılma ünvanı <span style={{ color: '#FF2D78' }}>*</span>
            </label>
            <textarea
              rows={3}
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              placeholder="Şəhər, küçə, ev nömrəsi..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
            />
          </div>
        )}

        {/* Phone */}
        <div>
          <label className="text-sm font-semibold mb-2 block" style={{ color: '#1a1040' }}>
            Əlaqə nömrəsi <span style={{ color: '#FF2D78' }}>*</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+994 50 000 00 00"
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
          />
        </div>

        {/* Note */}
        <div>
          <label className="text-sm font-semibold mb-2 block" style={{ color: '#1a1040' }}>
            Satıcıya qeyd <span className="text-gray-400 font-normal">(isteğe bağlı)</span>
          </label>
          <textarea
            rows={2}
            value={form.note}
            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
            placeholder="Hər hansı xüsusi istək..."
            className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
          />
        </div>

        <button
          onClick={submitOrder}
          disabled={submitting || (form.delivery && !form.address.trim()) || !form.phone.trim() || form.phone === '+994'}
          className="w-full py-4 rounded-2xl font-bold text-white text-base transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040', boxShadow: '3px 3px 0 #1a1040' }}
        >
          {submitting ? 'Göndərilir...' : `✓ Sifarişi təsdiqlə · ${listing.price} ₼`}
        </button>
      </div>
    </main>
  )
}
