'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { MessageRow } from '@/lib/supabase'
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

export default function ChatDrawer({
  listingId, sellerId, sellerName, sellerAvatarUrl, listingTitle, listingPrice, listingImage,
  currentUserId, onClose,
}: Props) {
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [spamWarning, setSpamWarning] = useState(false)
  const msgTimestamps = useRef<number[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  // Load messages + mark incoming as read
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
          .filter((m) => m.receiver_id === currentUserId && !m.is_read)
          .map((m) => m.id)
        if (unreadIds.length > 0) {
          supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then(() => {})
        }
      })
  }, [listingId, currentUserId, sellerId])

  // Realtime subscription — filter by listing_id, client-side filter for this conversation
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
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
            if (msg.receiver_id === currentUserId) {
              supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then(() => {})
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') return
          if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            console.warn('[ChatDrawer] realtime channel', status, channelName)
          }
        })
    } catch (err) {
      console.warn('[ChatDrawer] failed to create realtime channel', err)
    }

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [listingId, currentUserId, sellerId])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const trimmed = sanitize(text)
    if (!trimmed || sending) return

    // Spam protection: max 10 messages per 60 seconds
    const now = Date.now()
    const recent = msgTimestamps.current.filter((t) => now - t < 60_000)
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
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev
        return [...prev, data as MessageRow]
      })
    }
  }

  return (
    <>
      {/* Backdrop — full dim on mobile, subtle on desktop */}
      <div className="fixed inset-0 z-40 bg-black/50 md:bg-black/20" onClick={onClose} />

      {/* Sheet — bottom sheet on mobile, right panel on desktop */}
      <div
        className="fixed z-50 flex flex-col overflow-hidden
                   bottom-0 left-0 right-0 rounded-t-3xl
                   md:bottom-4 md:right-4 md:left-auto md:w-[440px] md:rounded-3xl"
        style={{ backgroundColor: 'white', border: '2px solid #1a1040', maxHeight: '85vh', height: '85vh' }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ backgroundColor: '#1a1040' }}
        >
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
          {messages.map((msg) => {
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

        {/* Spam warning */}
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
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
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
