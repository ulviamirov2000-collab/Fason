'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import ChatDrawer from '@/components/ChatDrawer'

const ADMIN_EMAIL = 'ulvi.amirov.2000@gmail.com'

// ── Suspicious content detection ──────────────────────────────────────────────
const PHONE_RE  = /(\+?\d[\d\s\-().]{6,}\d)/
const LINK_RE   = /(https?:\/\/|www\.|\b(?:t\.me|wa\.me|instagram\.com|whatsapp)\b)/i

function isSuspicious(text: string) {
  return PHONE_RE.test(text) || LINK_RE.test(text)
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Convo = {
  key:           string
  listing_id:    string
  listing_title: string
  listing_image: string | null
  buyer_id:      string
  buyer_name:    string
  seller_id:     string
  seller_name:   string
  last_message:  string
  last_at:       string
  msg_count:     number
  flagged:       boolean
  messages:      MsgRow[]
}

type MsgRow = {
  id:         string
  sender_id:  string
  text:       string
  created_at: string
  flagged:    boolean
}

type AdminListing = {
  id:          string
  title_az:    string
  images:      string[]
  price:       number
  status:      string
  views:       number
  basket_count: number
  created_at:  string
  seller_name: string
  seller_id:   string
}

type AdminUser = {
  id:            string
  email:         string | null
  full_name:     string | null
  avatar_url:    string | null
  is_seller:     boolean
  is_banned:     boolean
  created_at:    string
  listing_count: number
  message_count: number
}

type AdminOrder = {
  id:               string
  listing_title:    string
  listing_image:    string | null
  listing_id:       string
  buyer_id:         string
  buyer_name:       string
  seller_id:        string
  seller_name:      string
  final_price:      number
  delivery_needed:  boolean
  delivery_address: string | null
  phone:            string | null
  note:             string | null
  status:           string
  is_seen:          boolean
  created_at:       string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('az-AZ', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const [authed,  setAuthed]  = useState(false)
  const [tab,     setTab]     = useState<'messages' | 'listings' | 'users' | 'orders' | 'reports'>('messages')
  const [loading, setLoading] = useState(true)

  // Messages tab
  const [convos,     setConvos]     = useState<Convo[]>([])
  const [openConvo,  setOpenConvo]  = useState<Convo | null>(null)
  const [msgSearch,  setMsgSearch]  = useState('')

  // Listings tab
  const [listings,   setListings]   = useState<AdminListing[]>([])
  const [listSearch, setListSearch] = useState('')

  // Users tab
  const [users,      setUsers]      = useState<AdminUser[]>([])
  const [userSearch, setUserSearch] = useState('')

  // Orders tab
  const [orders,      setOrders]      = useState<AdminOrder[]>([])
  const [unseenCount, setUnseenCount] = useState(0)

  // Admin user ID + chat drawer
  const [adminUserId,  setAdminUserId]  = useState<string | null>(null)
  const [chatTarget,   setChatTarget]   = useState<{ userId: string; listingId: string; userName: string; listingTitle: string; listingPrice: number; listingImage?: string } | null>(null)

  // ── Auth check ───────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email !== ADMIN_EMAIL) {
        router.replace('/')
        return
      }
      setAdminUserId(data.user.id)
      setAuthed(true)
    })
  }, [router])

  // ── Data loaders ─────────────────────────────────────────────────────────────
  const loadMessages = useCallback(async () => {
    setLoading(true)

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (!msgs) { setLoading(false); return }

    const userIds    = [...new Set([...msgs.map(m => m.sender_id), ...msgs.map(m => m.receiver_id)])]
    const listingIds = [...new Set(msgs.map(m => m.listing_id))]

    const [{ data: usersData }, { data: listingsData }] = await Promise.all([
      supabase.from('users').select('id, full_name, email').in('id', userIds),
      supabase.from('listings').select('id, title_az, images').in('id', listingIds),
    ])

    const uMap = new Map((usersData ?? []).map(u => [u.id, u]))
    const lMap = new Map((listingsData ?? []).map(l => [l.id, l]))

    // Group into conversations: (listing_id, sorted pair of user ids)
    const convMap = new Map<string, Convo>()

    // msgs are sorted newest-first — iterate reversed to build in order
    for (const m of [...msgs].reverse()) {
      const pair = [m.sender_id, m.receiver_id].sort().join(':')
      const key  = `${m.listing_id}::${pair}`

      const flagged = isSuspicious(m.text)
      const msgRow: MsgRow = {
        id:         m.id,
        sender_id:  m.sender_id,
        text:       m.text,
        created_at: m.created_at,
        flagged,
      }

      if (!convMap.has(key)) {
        const listing = lMap.get(m.listing_id)
        const senderU   = uMap.get(m.sender_id)
        const receiverU = uMap.get(m.receiver_id)
        const sName = (u: typeof senderU) => u?.full_name || u?.email?.split('@')[0] || 'İstifadəçi'

        // Determine buyer vs seller heuristically: first sender is buyer
        convMap.set(key, {
          key,
          listing_id:    m.listing_id,
          listing_title: listing?.title_az ?? 'Elan',
          listing_image: (listing?.images as string[])?.[0] ?? null,
          buyer_id:      m.sender_id,
          buyer_name:    sName(senderU),
          seller_id:     m.receiver_id,
          seller_name:   sName(receiverU),
          last_message:  m.text,
          last_at:       m.created_at,
          msg_count:     0,
          flagged:       false,
          messages:      [],
        })
      }

      const c = convMap.get(key)!
      c.messages.push(msgRow)
      c.last_message = m.text
      c.last_at      = m.created_at
      c.msg_count++
      if (flagged) c.flagged = true
    }

    setConvos([...convMap.values()].sort((a, b) => b.last_at.localeCompare(a.last_at)))
    setLoading(false)
  }, [])

  const loadListings = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('listings')
      .select('*, users:seller_id(id, full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (data) {
      setListings(data.map((l: any) => ({
        id:          l.id,
        title_az:    l.title_az,
        images:      l.images ?? [],
        price:       l.price,
        status:      l.status,
        views:       l.views ?? 0,
        basket_count: l.basket_count ?? 0,
        created_at:  l.created_at,
        seller_id:   l.seller_id,
        seller_name: l.users?.full_name || l.users?.email?.split('@')[0] || 'Satıcı',
      })))
    }
    setLoading(false)
  }, [])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const { data: uData } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    if (!uData) { setLoading(false); return }

    const ids = uData.map(u => u.id)

    const [{ data: lCounts }, { data: mCounts }] = await Promise.all([
      supabase.from('listings').select('seller_id').in('seller_id', ids),
      supabase.from('messages').select('sender_id').in('sender_id', ids),
    ])

    const lMap = new Map<string, number>()
    for (const l of lCounts ?? []) lMap.set(l.seller_id, (lMap.get(l.seller_id) ?? 0) + 1)
    const mMap = new Map<string, number>()
    for (const m of mCounts ?? []) mMap.set(m.sender_id, (mMap.get(m.sender_id) ?? 0) + 1)

    setUsers(uData.map((u: any) => ({
      id:            u.id,
      email:         u.email,
      full_name:     u.full_name,
      avatar_url:    u.avatar_url,
      is_seller:     u.is_seller,
      is_banned:     u.is_banned ?? false,
      created_at:    u.created_at,
      listing_count: lMap.get(u.id) ?? 0,
      message_count: mMap.get(u.id) ?? 0,
    })))
    setLoading(false)
  }, [])

  const loadOrders = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*, listings:listing_id(id, title_az, images), buyers:buyer_id(full_name, email), sellers:seller_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setOrders(data.map((o: any) => ({
        id:               o.id,
        listing_id:       o.listing_id,
        listing_title:    o.listings?.title_az ?? 'Elan',
        listing_image:    o.listings?.images?.[0] ?? null,
        buyer_id:         o.buyer_id,
        buyer_name:       o.buyers?.full_name || o.buyers?.email?.split('@')[0] || 'Alıcı',
        seller_id:        o.seller_id,
        seller_name:      o.sellers?.full_name || o.sellers?.email?.split('@')[0] || 'Satıcı',
        final_price:      o.final_price,
        delivery_needed:  o.delivery_needed ?? false,
        delivery_address: o.delivery_address,
        phone:            o.phone,
        note:             o.note,
        status:           o.status,
        is_seen:          o.is_seen ?? true,
        created_at:       o.created_at,
      })))
      setUnseenCount(data.filter((o: any) => !o.is_seen).length)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!authed) return
    if (tab === 'messages') loadMessages()
    if (tab === 'listings') loadListings()
    if (tab === 'users')    loadUsers()
    if (tab === 'orders')   loadOrders()
  }, [authed, tab, loadMessages, loadListings, loadUsers, loadOrders])

  // Fetch unseen order count for badge (on mount)
  useEffect(() => {
    if (!authed) return
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('is_seen', false)
      .then(({ count }) => setUnseenCount(count ?? 0))
  }, [authed])

  // ── Actions ───────────────────────────────────────────────────────────────────
  async function deleteListing(id: string) {
    if (!confirm('Elanı silmək istədiyinizə əminsiniz?')) return
    await supabase.from('listings').delete().eq('id', id)
    setListings(prev => prev.filter(l => l.id !== id))
  }

  async function archiveListing(id: string) {
    await supabase.from('listings').update({ status: 'archived' }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'archived' } : l))
  }

  async function restoreListing(id: string) {
    await supabase.from('listings').update({ status: 'active' }).eq('id', id)
    setListings(prev => prev.map(l => l.id === id ? { ...l, status: 'active' } : l))
  }

  async function toggleBan(user: AdminUser) {
    const newBanned = !user.is_banned
    if (newBanned && !confirm(`${user.full_name || user.email} istifadəçisini ban etmək istədiyinizə əminsiniz?`)) return
    await supabase.from('users').update({ is_banned: newBanned }).eq('id', user.id)
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_banned: newBanned } : u))
  }

  async function updateOrderStatus(id: string, status: string) {
    await supabase.from('orders').update({ status, is_seen: true }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status, is_seen: true } : o))
    setUnseenCount(prev => Math.max(0, prev - 1))
  }

  async function markOrdersSeen() {
    await supabase.from('orders').update({ is_seen: true }).eq('is_seen', false)
    setOrders(prev => prev.map(o => ({ ...o, is_seen: true })))
    setUnseenCount(0)
  }

  async function deleteMessage(id: string) {
    await supabase.from('messages').delete().eq('id', id)
    if (openConvo) {
      setOpenConvo(prev => prev ? { ...prev, messages: prev.messages.filter(m => m.id !== id) } : null)
    }
    setConvos(prev => prev.map(c => ({
      ...c,
      messages: c.messages.filter(m => m.id !== id),
      flagged: c.messages.filter(m => m.id !== id).some(m => m.flagged),
    })))
  }

  // ── Guard ─────────────────────────────────────────────────────────────────────
  if (!authed) return null

  const TABS = [
    { key: 'messages', icon: '💬', label: 'Mesajlar',      badge: 0 },
    { key: 'listings', icon: '📦', label: 'Elanlar',       badge: 0 },
    { key: 'users',    icon: '👥', label: 'İstifadəçilər', badge: 0 },
    { key: 'orders',   icon: '🛍', label: 'Sifarişlər',    badge: unseenCount },
    { key: 'reports',  icon: '🚨', label: 'Şikayətlər',    badge: 0 },
  ] as const

  // ── Filtered data ─────────────────────────────────────────────────────────────
  const filteredConvos = convos.filter(c =>
    !msgSearch ||
    c.buyer_name.toLowerCase().includes(msgSearch.toLowerCase()) ||
    c.seller_name.toLowerCase().includes(msgSearch.toLowerCase()) ||
    c.listing_title.toLowerCase().includes(msgSearch.toLowerCase())
  )

  const filteredListings = listings.filter(l =>
    !listSearch ||
    l.title_az.toLowerCase().includes(listSearch.toLowerCase()) ||
    l.seller_name.toLowerCase().includes(listSearch.toLowerCase())
  )

  const filteredUsers = users.filter(u =>
    !userSearch ||
    (u.email ?? '').toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.full_name ?? '').toLowerCase().includes(userSearch.toLowerCase())
  )

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#f5f5f5' }}>

      {/* ── Sidebar ── */}
      <aside
        className="w-56 flex-shrink-0 flex flex-col py-6 gap-1"
        style={{ backgroundColor: '#1a1040', borderRight: '2px solid #0d0820' }}
      >
        <div className="px-5 mb-6">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#FF2D78' }}>FASON</p>
          <p className="text-white font-bold text-lg">Admin Panel</p>
        </div>

        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex items-center gap-3 mx-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left"
            style={
              tab === t.key
                ? { backgroundColor: '#FF2D78', color: 'white' }
                : { color: '#9ca3af' }
            }
          >
            <span>{t.icon}</span>
            <span className="flex-1">{t.label}</span>
            {t.badge > 0 && (
              <span
                className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
                style={{ backgroundColor: tab === t.key ? 'white' : '#FF2D78', color: tab === t.key ? '#FF2D78' : 'white' }}
              >
                {t.badge}
              </span>
            )}
          </button>
        ))}

        <div className="mt-auto mx-3">
          <a
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            ← Sayta qayıt
          </a>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}
        >
          <h1 className="font-bold text-lg" style={{ color: '#1a1040' }}>
            {TABS.find(t => t.key === tab)?.icon} {TABS.find(t => t.key === tab)?.label}
          </h1>
          <span className="text-xs text-gray-400">{ADMIN_EMAIL}</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {loading && (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Yüklənir...
            </div>
          )}

          {/* ── MESSAGES TAB ── */}
          {!loading && tab === 'messages' && (
            <div className="flex gap-6 h-full">

              {/* Conversation list */}
              <div className="flex flex-col gap-3" style={{ width: openConvo ? '380px' : '100%', flexShrink: 0 }}>
                <input
                  type="text"
                  value={msgSearch}
                  onChange={e => setMsgSearch(e.target.value)}
                  placeholder="İstifadəçi adı və ya elan axtar..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}
                />
                <p className="text-xs text-gray-400">{filteredConvos.length} söhbət</p>

                <div className="flex flex-col gap-2">
                  {filteredConvos.map(c => (
                    <button
                      key={c.key}
                      onClick={() => setOpenConvo(openConvo?.key === c.key ? null : c)}
                      className="flex items-center gap-3 p-3 rounded-2xl text-left transition-all hover:shadow-md"
                      style={{
                        backgroundColor: openConvo?.key === c.key ? '#fff0f5' : 'white',
                        border: `1.5px solid ${c.flagged ? '#FF2D78' : openConvo?.key === c.key ? '#FF2D78' : '#e5e7eb'}`,
                      }}
                    >
                      {/* Listing image */}
                      <div className="w-10 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        {c.listing_image ? (
                          <Image src={c.listing_image} alt={c.listing_title} width={40} height={48} className="object-cover w-full h-full" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">👗</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-semibold text-gray-800 truncate max-w-[140px]">{c.listing_title}</span>
                          {c.flagged && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0" style={{ backgroundColor: '#FF2D78' }}>
                              ⚠ Şübhəli
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {c.buyer_name} → {c.seller_name}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{c.last_message}</p>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-gray-400">{fmt(c.last_at)}</span>
                        <span className="text-[10px] text-gray-400">{c.msg_count} mesaj</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Thread view */}
              {openConvo && (
                <div
                  className="flex-1 flex flex-col rounded-2xl overflow-hidden"
                  style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}
                >
                  {/* Thread header */}
                  <div
                    className="flex items-center justify-between px-5 py-3 flex-shrink-0"
                    style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: '#f9fafb' }}
                  >
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#1a1040' }}>{openConvo.listing_title}</p>
                      <p className="text-xs text-gray-500">{openConvo.buyer_name} ↔ {openConvo.seller_name} · {openConvo.msg_count} mesaj</p>
                    </div>
                    <button
                      onClick={() => setOpenConvo(null)}
                      className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                    >
                      ×
                    </button>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2" style={{ backgroundColor: '#fafafa' }}>
                    {openConvo.messages.map(m => {
                      const isBuyer = m.sender_id === openConvo.buyer_id
                      return (
                        <div key={m.id} className={`flex ${isBuyer ? 'justify-start' : 'justify-end'} gap-2`}>
                          <div
                            className="max-w-[70%] px-4 py-2.5 rounded-2xl text-sm relative group"
                            style={{
                              backgroundColor: m.flagged ? '#fff0f5' : isBuyer ? '#f3f4f6' : '#1a1040',
                              color: isBuyer ? '#1a1040' : 'white',
                              border: m.flagged ? '1.5px solid #FF2D78' : 'none',
                            }}
                          >
                            <p className="leading-snug">{m.text}</p>
                            <div className="flex items-center justify-between gap-3 mt-1">
                              <p className="text-[10px] opacity-60">{isBuyer ? openConvo.buyer_name : openConvo.seller_name} · {fmt(m.created_at)}</p>
                              {m.flagged && <span className="text-[10px] font-bold" style={{ color: '#FF2D78' }}>⚠</span>}
                            </div>
                            {/* Delete button (admin only) */}
                            <button
                              onClick={() => deleteMessage(m.id)}
                              className="absolute -top-2 -right-2 hidden group-hover:flex w-5 h-5 rounded-full items-center justify-center text-white text-xs"
                              style={{ backgroundColor: '#FF2D78' }}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── LISTINGS TAB ── */}
          {!loading && tab === 'listings' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={listSearch}
                  onChange={e => setListSearch(e.target.value)}
                  placeholder="Elan adı və ya satıcı axtar..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}
                />
                <span className="text-xs text-gray-400 flex-shrink-0">{filteredListings.length} elan</span>
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Elan</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Satıcı</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Qiymət</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Baxış</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Səbət</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tarix</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredListings.map((l, i) => (
                      <tr
                        key={l.id}
                        style={{ borderBottom: i < filteredListings.length - 1 ? '1px solid #f9fafb' : 'none' }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                              {l.images[0] ? (
                                <Image src={l.images[0]} alt={l.title_az} width={40} height={48} className="object-cover w-full h-full" unoptimized />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-base">👗</div>
                              )}
                            </div>
                            <a
                              href={`/listing/${l.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold hover:underline line-clamp-2 max-w-[160px]"
                              style={{ color: '#1a1040' }}
                            >
                              {l.title_az}
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{l.seller_name}</td>
                        <td className="px-4 py-3 text-xs font-bold" style={{ color: '#1a1040' }}>{l.price} ₼</td>
                        <td className="px-4 py-3">
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={
                              l.status === 'active'   ? { backgroundColor: '#e8fdf5', color: '#10b981' } :
                              l.status === 'sold'     ? { backgroundColor: '#eff6ff', color: '#3b82f6' } :
                                                        { backgroundColor: '#f9fafb', color: '#9ca3af' }
                            }
                          >
                            {l.status === 'active' ? 'Aktiv' : l.status === 'sold' ? 'Satıldı' : 'Arxiv'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{l.views}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{l.basket_count}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(l.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {l.status !== 'archived' ? (
                              <button
                                onClick={() => archiveListing(l.id)}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-gray-100"
                                style={{ color: '#6b7280', border: '1px solid #e5e7eb' }}
                              >
                                Arxivlə
                              </button>
                            ) : (
                              <button
                                onClick={() => restoreListing(l.id)}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-green-50"
                                style={{ color: '#10b981', border: '1px solid #d1fae5' }}
                              >
                                Bərpa et
                              </button>
                            )}
                            <button
                              onClick={() => deleteListing(l.id)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-red-50"
                              style={{ color: '#ef4444', border: '1px solid #fee2e2' }}
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredListings.length === 0 && (
                  <div className="py-12 text-center text-sm text-gray-400">Elan tapılmadı</div>
                )}
              </div>
            </div>
          )}

          {/* ── USERS TAB ── */}
          {!loading && tab === 'users' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Ad və ya email axtar..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}
                />
                <span className="text-xs text-gray-400 flex-shrink-0">{filteredUsers.length} istifadəçi</span>
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">İstifadəçi</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Qeydiyyat</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Elanlar</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Mesajlar</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: i < filteredUsers.length - 1 ? '1px solid #f9fafb' : 'none',
                          backgroundColor: u.is_banned ? '#fff5f5' : 'transparent',
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 overflow-hidden flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            >
                              {u.avatar_url ? (
                                <Image src={u.avatar_url} alt={u.full_name ?? ''} width={32} height={32} className="object-cover w-full h-full" unoptimized />
                              ) : (
                                (u.full_name?.[0] || u.email?.[0] || '?').toUpperCase()
                              )}
                            </div>
                            <a
                              href={`/profile/${u.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold hover:underline"
                              style={{ color: '#1a1040' }}
                            >
                              {u.full_name || '—'}
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{u.email ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(u.created_at)}</td>
                        <td className="px-4 py-3 text-xs font-semibold" style={{ color: '#1a1040' }}>{u.listing_count}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{u.message_count}</td>
                        <td className="px-4 py-3">
                          {u.is_banned ? (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
                              Banlı
                            </span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f0fdf4', color: '#22c55e' }}>
                              Aktiv
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {u.email !== ADMIN_EMAIL && (
                            <button
                              onClick={() => toggleBan(u)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                              style={
                                u.is_banned
                                  ? { color: '#22c55e', border: '1px solid #d1fae5', backgroundColor: 'transparent' }
                                  : { color: '#ef4444', border: '1px solid #fee2e2', backgroundColor: 'transparent' }
                              }
                            >
                              {u.is_banned ? 'Banı aç' : 'Ban et'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <div className="py-12 text-center text-sm text-gray-400">İstifadəçi tapılmadı</div>
                )}
              </div>
            </div>
          )}

          {/* ── ORDERS TAB ── */}
          {!loading && tab === 'orders' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">{orders.length} sifariş</span>
                {unseenCount > 0 && (
                  <button
                    onClick={markOrdersSeen}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:bg-gray-100"
                    style={{ border: '1px solid #e5e7eb', color: '#6b7280' }}
                  >
                    Hamısını oxunmuş işarələ
                  </button>
                )}
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Elan</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Alıcı</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Qiymət</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Kuryer</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Əlaqə</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Tarix</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Əməliyyat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o, i) => (
                      <tr
                        key={o.id}
                        style={{
                          borderBottom: i < orders.length - 1 ? '1px solid #f9fafb' : 'none',
                          backgroundColor: !o.is_seen ? '#fffbeb' : 'transparent',
                        }}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                              {o.listing_image ? (
                                <Image src={o.listing_image} alt={o.listing_title} width={32} height={40} className="object-cover w-full h-full" unoptimized />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm">👗</div>
                              )}
                            </div>
                            <a
                              href={`/listing/${o.listing_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold hover:underline max-w-[120px] line-clamp-2"
                              style={{ color: '#1a1040' }}
                            >
                              {o.listing_title}
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          <div>{o.buyer_name}</div>
                          {o.note && <div className="text-gray-400 mt-0.5 max-w-[120px] truncate">📝 {o.note}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold" style={{ color: '#FF2D78' }}>
                          {o.final_price} ₼
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {o.delivery_needed ? (
                            <div>
                              <span className="font-semibold text-green-600">Hə</span>
                              {o.delivery_address && (
                                <div className="text-gray-400 mt-0.5 max-w-[120px] truncate">{o.delivery_address}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">Xeyr</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{o.phone}</td>
                        <td className="px-4 py-3">
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={
                              o.status === 'pending'   ? { backgroundColor: '#fffbeb', color: '#d97706' } :
                              o.status === 'confirmed' ? { backgroundColor: '#eff6ff', color: '#3b82f6' } :
                              o.status === 'delivered' ? { backgroundColor: '#f0fdf4', color: '#16a34a' } :
                                                         { backgroundColor: '#fef2f2', color: '#ef4444' }
                            }
                          >
                            {o.status === 'pending'   ? 'Gözlənilir' :
                             o.status === 'confirmed' ? 'Təsdiqləndi' :
                             o.status === 'delivered' ? 'Çatdırıldı'  : 'Ləğv edildi'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(o.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            {o.status === 'pending' && (
                              <button
                                onClick={() => updateOrderStatus(o.id, 'confirmed')}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                                style={{ color: '#3b82f6', border: '1px solid #bfdbfe' }}
                              >
                                Təsdiqlə
                              </button>
                            )}
                            {(o.status === 'pending' || o.status === 'confirmed') && (
                              <button
                                onClick={() => updateOrderStatus(o.id, 'delivered')}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-green-50 transition-colors"
                                style={{ color: '#16a34a', border: '1px solid #bbf7d0' }}
                              >
                                Çatdırıldı
                              </button>
                            )}
                            {o.status !== 'cancelled' && o.status !== 'delivered' && (
                              <button
                                onClick={() => updateOrderStatus(o.id, 'cancelled')}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                                style={{ color: '#ef4444', border: '1px solid #fecaca' }}
                              >
                                Ləğv et
                              </button>
                            )}
                            <button
                              onClick={() => setChatTarget({ userId: o.buyer_id, listingId: o.listing_id, userName: o.buyer_name, listingTitle: o.listing_title, listingPrice: o.final_price, listingImage: o.listing_image ?? undefined })}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-pink-50 transition-colors"
                              style={{ color: '#FF2D78', border: '1px solid #fecdd3' }}
                            >
                              💬 Alıcıya yaz
                            </button>
                            <button
                              onClick={() => setChatTarget({ userId: o.seller_id, listingId: o.listing_id, userName: o.seller_name, listingTitle: o.listing_title, listingPrice: o.final_price, listingImage: o.listing_image ?? undefined })}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-yellow-50 transition-colors"
                              style={{ color: '#d97706', border: '1px solid #fde68a' }}
                            >
                              💬 Satıcıya yaz
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {orders.length === 0 && (
                  <div className="py-12 text-center text-sm text-gray-400">Hələ sifariş yoxdur</div>
                )}
              </div>
            </div>
          )}

          {/* ── REPORTS TAB ── */}
          {!loading && tab === 'reports' && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <div className="text-4xl">🚨</div>
              <p className="font-semibold" style={{ color: '#1a1040' }}>Şikayət sistemi</p>
              <p className="text-sm text-gray-400">Tezliklə hazır olacaq</p>
            </div>
          )}

        </div>
      </main>

      {/* Admin → User ChatDrawer */}
      {chatTarget && adminUserId && (
        <ChatDrawer
          listingId={chatTarget.listingId}
          sellerId={chatTarget.userId}
          sellerName={chatTarget.userName}
          listingTitle={chatTarget.listingTitle}
          listingPrice={chatTarget.listingPrice}
          listingImage={chatTarget.listingImage}
          currentUserId={adminUserId}
          onClose={() => setChatTarget(null)}
        />
      )}
    </div>
  )
}
