'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { MessageRow } from '@/lib/supabase'

type Conversation = {
  key: string
  listingId: string
  listingTitle: string
  listingPrice: number
  listingImage?: string
  otherUserId: string
  otherUserName: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
}

type Props = {
  currentUserId: string
}

function formatRelative(iso: string): string {
  const now = new Date()
  const d = new Date(iso)
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return d.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
  if (diffDays === 1) return 'Dünən'
  if (diffDays < 7) return d.toLocaleDateString('az-AZ', { weekday: 'short' })
  return d.toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit' })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit' })
}

export default function MessagesUI({ currentUserId }: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeConvRef = useRef<Conversation | null>(null)

  useEffect(() => { activeConvRef.current = activeConv }, [activeConv])

  const loadConversations = useCallback(async () => {
    const { data: allMsgs } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order('created_at', { ascending: false })

    if (!allMsgs || allMsgs.length === 0) {
      setConversations([])
      setLoading(false)
      return
    }

    const listingIds = [...new Set(allMsgs.map((m) => m.listing_id))]
    const otherUserIds = [...new Set(
      allMsgs.map((m) => m.sender_id === currentUserId ? m.receiver_id : m.sender_id)
    )]

    const [{ data: listingsData }, { data: usersData }] = await Promise.all([
      supabase.from('listings').select('id, title_az, images, price').in('id', listingIds),
      supabase.from('users').select('id, full_name, email').in('id', otherUserIds),
    ])

    const listingMap = new Map((listingsData ?? []).map((l) => [l.id, l]))
    const userMap = new Map((usersData ?? []).map((u) => [u.id, u]))

    // Build conversations (allMsgs sorted newest first, so first occurrence = latest msg)
    const convMap = new Map<string, Conversation>()
    for (const msg of allMsgs) {
      const otherUserId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id
      const key = `${msg.listing_id}::${otherUserId}`

      if (!convMap.has(key)) {
        const listing = listingMap.get(msg.listing_id)
        const otherUser = userMap.get(otherUserId)
        const name = otherUser?.full_name || otherUser?.email?.split('@')[0] || 'İstifadəçi'
        convMap.set(key, {
          key,
          listingId: msg.listing_id,
          listingTitle: listing?.title_az ?? 'Elan',
          listingPrice: listing?.price ?? 0,
          listingImage: listing?.images?.[0] as string | undefined,
          otherUserId,
          otherUserName: name,
          lastMessage: msg.text,
          lastMessageAt: msg.created_at,
          unreadCount: 0,
        })
      }

      if (msg.receiver_id === currentUserId && !msg.is_read) {
        convMap.get(key)!.unreadCount++
      }
    }

    setConversations([...convMap.values()])
    setLoading(false)
  }, [currentUserId])

  useEffect(() => { loadConversations() }, [loadConversations])

  // Realtime: new message received by me
  useEffect(() => {
    const channel = supabase
      .channel(`inbox:${currentUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` },
        async (payload) => {
          const msg = payload.new as MessageRow
          // If message is for active conversation, add it and mark read
          const ac = activeConvRef.current
          if (ac && ac.listingId === msg.listing_id && ac.otherUserId === msg.sender_id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev
              return [...prev, msg]
            })
            supabase.from('messages').update({ is_read: true }).eq('id', msg.id).then(() => {})
          }
          // Refresh the conversation list
          await loadConversations()
          // Keep active conv unread count at 0 if it was the active one
          if (ac && ac.listingId === msg.listing_id && ac.otherUserId === msg.sender_id) {
            setConversations((prev) => prev.map((c) => c.key === ac.key ? { ...c, unreadCount: 0 } : c))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId, loadConversations])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function selectConversation(conv: Conversation) {
    setActiveConv(conv)
    setMessages([])
    setText('')

    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('listing_id', conv.listingId)
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${conv.otherUserId}),` +
        `and(sender_id.eq.${conv.otherUserId},receiver_id.eq.${currentUserId})`
      )
      .order('created_at', { ascending: true })

    setMessages(data ?? [])

    const unreadIds = (data ?? []).filter((m) => m.receiver_id === currentUserId && !m.is_read).map((m) => m.id)
    if (unreadIds.length > 0) {
      await supabase.from('messages').update({ is_read: true }).in('id', unreadIds)
      setConversations((prev) => prev.map((c) => c.key === conv.key ? { ...c, unreadCount: 0 } : c))
    }
  }

  async function sendMessage() {
    if (!text.trim() || sending || !activeConv) return
    const trimmed = text.trim()
    setSending(true)
    setText('')

    const { data } = await supabase
      .from('messages')
      .insert({
        listing_id: activeConv.listingId,
        sender_id: currentUserId,
        receiver_id: activeConv.otherUserId,
        text: trimmed,
        is_read: false,
      })
      .select()
      .single()

    setSending(false)
    if (data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev
        return [...prev, data as MessageRow]
      })
      setConversations((prev) =>
        prev.map((c) =>
          c.key === activeConv.key
            ? { ...c, lastMessage: trimmed, lastMessageAt: (data as MessageRow).created_at }
            : c
        )
      )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400 text-sm">Yüklənir...</div>
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* ── Conversation list ── */}
      <div
        className={`flex-shrink-0 flex-col rounded-2xl overflow-hidden ${activeConv ? 'hidden md:flex w-80' : 'flex w-full md:w-80'}`}
        style={{ border: '2px solid #1a1040', backgroundColor: 'white' }}
      >
        <div
          className="px-4 py-3 flex-shrink-0"
          style={{ backgroundColor: '#FAF7F2', borderBottom: '2px solid #1a1040' }}
        >
          <h2 className="font-bold text-base" style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}>
            Mesajlar
          </h2>
        </div>

        {conversations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm text-gray-500">Hələ söhbət yoxdur</p>
            <p className="text-xs text-gray-400 mt-1">Bir elan aç və satıcıya yaz</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {conversations.map((conv) => (
              <button
                key={conv.key}
                onClick={() => selectConversation(conv)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 border-b border-gray-100"
                style={activeConv?.key === conv.key ? { backgroundColor: '#FFF0F5' } : {}}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 mt-0.5"
                  style={{ border: '2px solid #1a1040' }}
                >
                  {conv.otherUserName[0]?.toUpperCase() ?? '?'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-sm truncate" style={{ color: '#1a1040' }}>
                      {conv.otherUserName}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatRelative(conv.lastMessageAt)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{conv.listingTitle}</p>
                  <p className="text-xs text-gray-400 truncate">{conv.lastMessage}</p>
                </div>

                {conv.unreadCount > 0 && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: '#FF2D78' }}
                  >
                    {conv.unreadCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Chat area ── */}
      {activeConv ? (
        <div
          className="flex flex-col flex-1 min-h-0 min-w-0 rounded-2xl overflow-hidden"
          style={{ border: '2px solid #1a1040' }}
        >
          {/* Chat header */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{ backgroundColor: '#1a1040' }}
          >
            <button
              onClick={() => setActiveConv(null)}
              className="md:hidden text-white/70 hover:text-white transition-colors mr-1 text-lg"
              aria-label="Geri"
            >
              ←
            </button>
            {activeConv.listingImage && (
              <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={activeConv.listingImage}
                  alt={activeConv.listingTitle}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{activeConv.listingTitle}</p>
              <p className="text-xs font-bold" style={{ color: '#FFE600' }}>{activeConv.listingPrice} ₼</p>
            </div>
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ border: '1.5px solid #FFE600' }}
            >
              {activeConv.otherUserName[0]?.toUpperCase() ?? '?'}
            </div>
            <span className="text-white/60 text-xs hidden sm:block truncate max-w-[80px]">
              {activeConv.otherUserName}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ backgroundColor: '#FAF7F2' }}>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <div className="text-3xl mb-2">👋</div>
                <p className="text-sm text-gray-400">Söhbəti davam etdir</p>
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
      ) : (
        <div
          className="hidden md:flex flex-1 items-center justify-center rounded-2xl"
          style={{ border: '2px solid #ccc', backgroundColor: 'white' }}
        >
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">Söhbət seç</p>
          </div>
        </div>
      )}
    </div>
  )
}
