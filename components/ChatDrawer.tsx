'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { MessageRow, OfferRow } from '@/lib/supabase'
import { sanitize } from '@/lib/sanitize'

type Props = {
  listingId: string
  sellerId: string
  sellerName: string
  sellerAvatarUrl?: string | null
  listingTitle: string
  listingPrice: number
  listingImage?: string
  currentUserId: string
  onClose: () => void
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
}

// ── Offer message parsing ─────────────────────────────────────────────────────
// Format: "💰 OFFER:{uuid}:{offeredPrice}:{listingPrice}"
const OFFER_RE = /^💰 OFFER:([a-f0-9-]{36}):(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/
// Format: "__SYS__{text}"
const SYS_PREFIX = '__SYS__'

function parseOfferMsg(text: string) {
  const m = OFFER_RE.exec(text)
  if (!m) return null
  return { offerId: m[1], offeredPrice: parseFloat(m[2]), listingPrice: parseFloat(m[3]) }
}

export default function ChatDrawer({
  listingId, sellerId, sellerName, sellerAvatarUrl, listingTitle, listingPrice, listingImage,
  currentUserId, onClose,
}: Props) {
  const [messages,      setMessages]      = useState<MessageRow[]>([])
  const [offers,        setOffers]        = useState<OfferRow[]>([])
  const [text,          setText]          = useState('')
  const [sending,       setSending]       = useState(false)
  const [spamWarning,   setSpamWarning]   = useState(false)
  const [counterInputs, setCounterInputs] = useState<Record<string, string>>({})
  const msgTimestamps = useRef<number[]>([])
  const bottomRef     = useRef<HTMLDivElement>(null)

  const isSeller = currentUserId === sellerId

  // ── Load messages + offers ────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('messages')
      .select('*')
      .eq('listing_id', listingId)
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${sellerId}),` +
        `and(sender_id.eq.${sellerId},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data ?? [])
        const unreadIds = (data ?? [])
          .filter(m => m.receiver_id === currentUserId && !m.is_read)
          .map(m => m.id)
        if (unreadIds.length > 0) {
          supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then(() => {})
        }
      })

    supabase
      .from('offers')
      .select('*')
      .eq('listing_id', listingId)
      .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
      .then(({ data }) => setOffers(data as OfferRow[] ?? []))
  }, [listingId, currentUserId, sellerId])

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const channelName = `drawer:${listingId}:${[currentUserId, sellerId].sort().join(':')}`
    let channel: ReturnType<typeof supabase.channel> | null = null

    try {
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `listing_id=eq.${listingId}` },
          (payload) => {
            const msg = payload.new as MessageRow
            const relevant =
              (msg.sender_id === currentUserId && msg.receiver_id === sellerId) ||
              (msg.sender_id === sellerId && msg.receiver_id === currentUserId)
            if (!relevant) return
            setMessages(prev => {
              if (prev.some(m => m.id === msg.id)) return prev
              return [...prev, msg]
            })
            if (msg.receiver_id === currentUserId) {
              supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then(() => {})
            }
            // Re-fetch offers whenever a new message arrives (offer status may have changed)
            supabase
              .from('offers')
              .select('*')
              .eq('listing_id', listingId)
              .or(`buyer_id.eq.${currentUserId},seller_id.eq.${currentUserId}`)
              .then(({ data }) => setOffers(data as OfferRow[] ?? []))
          }
        )
        .subscribe(status => {
          if (status === 'SUBSCRIBED') return
          if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            console.warn('[ChatDrawer] realtime channel', status, channelName)
          }
        })
    } catch (err) {
      console.warn('[ChatDrawer] failed to create realtime channel', err)
    }

    return () => { if (channel) supabase.removeChannel(channel) }
  }, [listingId, currentUserId, sellerId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage() {
    const trimmed = sanitize(text)
    if (!trimmed || sending) return

    const now = Date.now()
    const recent = msgTimestamps.current.filter(t => now - t < 60_000)
    if (recent.length >= 10) {
      setSpamWarning(true)
      setTimeout(() => setSpamWarning(false), 3000)
      return
    }
    msgTimestamps.current = [...recent, now]

    setSending(true)
    setText('')

    const { data } = await supabase
      .from('messages')
      .insert({ listing_id: listingId, sender_id: currentUserId, receiver_id: sellerId, text: trimmed, is_read: false })
      .select()
      .single()

    setSending(false)
    if (data) {
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev
        return [...prev, data as MessageRow]
      })
    }
  }

  // ── Send system message (internal) ───────────────────────────────────────
  async function sendSysMsg(toUserId: string, text: string) {
    await supabase.from('messages').insert({
      listing_id:  listingId,
      sender_id:   currentUserId,
      receiver_id: toUserId,
      text:        `${SYS_PREFIX}${text}`,
      is_read:     false,
    })
  }

  // ── Offer actions (seller) ────────────────────────────────────────────────
  async function acceptOffer(offer: OfferRow) {
    await supabase.from('offers').update({ status: 'accepted' }).eq('id', offer.id)
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: 'accepted' } : o))
    await sendSysMsg(
      offer.buyer_id,
      `✅ Satıcı ${offer.offered_price} ₼ qiymət təklifinizi qəbul etdi! Alış üçün çat pəncərəsindəki "Al" düyməsinə basın.`
    )
  }

  async function rejectOffer(offer: OfferRow) {
    await supabase.from('offers').update({ status: 'rejected' }).eq('id', offer.id)
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: 'rejected' } : o))
    await sendSysMsg(offer.buyer_id, `❌ Satıcı qiymət təklifinizi rədd etdi.`)
  }

  async function sendCounter(offer: OfferRow) {
    const cp = parseFloat(counterInputs[offer.id] ?? '')
    if (!cp || cp <= 0) return
    await supabase.from('offers').update({ status: 'countered', counter_price: cp }).eq('id', offer.id)
    setOffers(prev => prev.map(o => o.id === offer.id ? { ...o, status: 'countered', counter_price: cp } : o))
    setCounterInputs(prev => { const n = { ...prev }; delete n[offer.id]; return n })
    await sendSysMsg(
      offer.buyer_id,
      `💬 Satıcı əks-təklif etdi: ${cp} ₼ (Sizin təklifiniz: ${offer.offered_price} ₼). Qəbul etmək üçün "Al" düyməsinə basın.`
    )
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  function renderOfferCard(offer: OfferRow, parsed: { offeredPrice: number; listingPrice: number }) {
    const isMyOffer = offer.buyer_id === currentUserId // buyer perspective
    const status    = offer.status

    return (
      <div
        className="flex flex-col gap-3 p-3 rounded-2xl"
        style={{ backgroundColor: '#FFF8E1', border: '2px solid #FFE600', maxWidth: '85%', alignSelf: isMyOffer ? 'flex-end' : 'flex-start' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <div>
            <p className="text-xs font-bold" style={{ color: '#1a1040' }}>Qiymət təklifi</p>
            <p className="text-lg font-bold" style={{ color: '#FF2D78' }}>{parsed.offeredPrice} ₼</p>
            <p className="text-xs text-gray-400">Orijinal qiymət: {parsed.listingPrice} ₼</p>
          </div>
        </div>

        {/* Status badge */}
        {status === 'rejected' && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full self-start" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
            ❌ Rədd edildi
          </span>
        )}
        {status === 'accepted' && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full self-start" style={{ backgroundColor: '#d1fae5', color: '#10b981' }}>
            ✅ Qəbul edildi
          </span>
        )}
        {status === 'countered' && offer.counter_price && (
          <span className="text-xs font-semibold px-2 py-1 rounded-full self-start" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>
            💬 Əks-təklif: {offer.counter_price} ₼
          </span>
        )}

        {/* Seller actions — only on pending offers */}
        {isSeller && status === 'pending' && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => acceptOffer(offer)}
                className="flex-1 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                style={{ backgroundColor: '#10b981' }}
              >
                ✓ Qəbul et
              </button>
              <button
                onClick={() => rejectOffer(offer)}
                className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all hover:bg-red-50"
                style={{ border: '1.5px solid #ef4444', color: '#ef4444' }}
              >
                ✗ Rədd et
              </button>
            </div>
            {counterInputs[offer.id] !== undefined ? (
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  min={1}
                  value={counterInputs[offer.id]}
                  onChange={e => setCounterInputs(prev => ({ ...prev, [offer.id]: e.target.value }))}
                  placeholder="Əks-təklif ₼"
                  className="flex-1 px-2 py-1.5 rounded-xl text-xs outline-none"
                  style={{ border: '1.5px solid #1a1040' }}
                  autoFocus
                />
                <button
                  onClick={() => sendCounter(offer)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                  style={{ backgroundColor: '#FF9800' }}
                >
                  Göndər
                </button>
                <button
                  onClick={() => setCounterInputs(prev => { const n = { ...prev }; delete n[offer.id]; return n })}
                  className="px-2 py-1.5 rounded-xl text-xs text-gray-400"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCounterInputs(prev => ({ ...prev, [offer.id]: '' }))}
                className="py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-orange-50"
                style={{ border: '1.5px solid #FF9800', color: '#FF9800' }}
              >
                ↩ Əks-təklif
              </button>
            )}
          </div>
        )}

        {/* Buyer: "Al" button when accepted or countered */}
        {!isSeller && (status === 'accepted' || (status === 'countered' && offer.counter_price)) && (
          <Link
            href={`/order/${listingId}?offer=${offer.id}`}
            className="block py-2 rounded-xl text-xs font-bold text-white text-center transition-all hover:opacity-90"
            style={{ backgroundColor: '#10b981' }}
          >
            🛍 Al · {status === 'accepted' ? offer.offered_price : offer.counter_price} ₼
          </Link>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 md:bg-black/20" onClick={onClose} />

      <div
        className="fixed z-50 flex flex-col overflow-hidden
                   bottom-0 left-0 right-0 rounded-t-3xl
                   md:bottom-4 md:right-4 md:left-auto md:w-[440px] md:rounded-3xl"
        style={{ backgroundColor: 'white', border: '2px solid #1a1040', maxHeight: '85vh', height: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0" style={{ backgroundColor: '#1a1040' }}>
          <div className="w-10 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-pink-200 to-yellow-100 flex items-center justify-center">
            {listingImage ? (
              <Image src={listingImage} alt={listingTitle} width={40} height={48} className="object-cover w-full h-full" unoptimized />
            ) : (
              <span className="text-lg">👗</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{listingTitle}</p>
            <p className="text-xs font-bold" style={{ color: '#FFE600' }}>{listingPrice} ₼</p>
          </div>
          <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 overflow-hidden flex items-center justify-center text-xs font-bold text-white"
              style={{ border: '1.5px solid #FFE600' }}
            >
              {sellerAvatarUrl ? (
                <Image src={sellerAvatarUrl} alt={sellerName} width={32} height={32} className="object-cover w-full h-full" unoptimized />
              ) : (
                sellerName[0]?.toUpperCase() ?? '?'
              )}
            </div>
            <p className="text-white/60 text-xs truncate max-w-[60px]">{sellerName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 ml-1 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ backgroundColor: '#FAF7F2' }}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="text-4xl mb-3">👋</div>
              <p className="text-sm text-gray-500 font-medium">Söhbəti başlat</p>
              <p className="text-xs text-gray-400 mt-1">{sellerName} cavab verəcək</p>
            </div>
          )}

          {messages.map(msg => {
            // System message
            if (msg.text.startsWith(SYS_PREFIX)) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <p
                    className="text-xs text-center px-3 py-1.5 rounded-full max-w-[85%]"
                    style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}
                  >
                    {msg.text.slice(SYS_PREFIX.length)}
                  </p>
                </div>
              )
            }

            // Offer message
            const parsed = parseOfferMsg(msg.text)
            if (parsed) {
              const offer = offers.find(o => o.id === parsed.offerId)
              if (offer) {
                return (
                  <div key={msg.id} className="flex flex-col">
                    {renderOfferCard(offer, parsed)}
                    <p
                      className="text-[10px] text-gray-400 mt-1"
                      style={{ textAlign: offer.buyer_id === currentUserId ? 'right' : 'left' }}
                    >
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                )
              }
            }

            // Regular message
            const isMine = msg.sender_id === currentUserId
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[75%] px-4 py-2.5 text-sm"
                  style={
                    isMine
                      ? { backgroundColor: '#FF2D78', color: 'white', borderRadius: '18px 18px 4px 18px', border: '1.5px solid #d01a60' }
                      : { backgroundColor: 'white', color: '#1a1040', borderRadius: '18px 18px 18px 4px', border: '1.5px solid #e5e7eb' }
                  }
                >
                  <p className="leading-snug">{msg.text}</p>
                  <p className={`text-xs mt-1 text-right ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                    {formatTime(msg.created_at)}
                    {isMine && <span className="ml-1">{msg.is_read ? '✓✓' : '✓'}</span>}
                  </p>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {spamWarning && (
          <div
            className="px-4 py-2 text-xs font-semibold text-center flex-shrink-0"
            style={{ backgroundColor: '#FFF0F5', color: '#FF2D78', borderTop: '1px solid #ffd0e0' }}
          >
            ⚠ Çox sürətli mesaj göndərirsiniz. Bir az gözləyin.
          </div>
        )}

        {/* Input */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderTop: '2px solid #e5e7eb', backgroundColor: 'white' }}
        >
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Mesaj yaz..."
            className="flex-1 px-4 py-2.5 rounded-full text-sm outline-none"
            style={{ border: '2px solid #1a1040', backgroundColor: '#FAF7F2' }}
          />
          <button
            onClick={sendMessage}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
            style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040' }}
          >
            <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
