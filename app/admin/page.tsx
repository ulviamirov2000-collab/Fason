'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import ChatDrawer from '@/components/ChatDrawer'
import MessagesUI from '@/components/MessagesUI'

const ADMIN_EMAIL = 'ulvi.amirov.2000@gmail.com'

// ── Types ─────────────────────────────────────────────────────────────────────
type AdminListing = {
  id:           string
  title_az:     string
  images:       string[]
  price:        number
  status:       string
  views:        number
  basket_count: number
  created_at:   string
  seller_name:  string
  seller_id:    string
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

type DashboardStats = {
  today_offers:          number
  today_orders:          number
  today_users:           number
  total_active_listings: number
  total_pending_orders:  number
  total_users:           number
}

type TrackingDeal = {
  offer_id:       string
  listing_id:     string
  listing_title:  string
  listing_image:  string | null
  listing_price:  number
  buyer_id:       string
  buyer_name:     string
  buyer_avatar:   string | null
  seller_id:      string
  seller_name:    string
  seller_avatar:  string | null
  offered_price:  number
  counter_price:  number | null
  status:         string
  created_at:     string
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
  const [tab,     setTab]     = useState<'dashboard' | 'tracking' | 'messages' | 'listings' | 'users' | 'orders' | 'reports'>('dashboard')
  const [loading, setLoading] = useState(true)

  // Tab data
  const [stats,         setStats]         = useState<DashboardStats | null>(null)
  const [trackingDeals, setTrackingDeals] = useState<TrackingDeal[]>([])
  const [listings,      setListings]      = useState<AdminListing[]>([])
  const [listSearch,    setListSearch]    = useState('')
  const [users,         setUsers]         = useState<AdminUser[]>([])
  const [userSearch,    setUserSearch]    = useState('')
  const [orders,        setOrders]        = useState<AdminOrder[]>([])
  const [unseenCount,   setUnseenCount]   = useState(0)

  // User detail panel
  const [selectedUser,        setSelectedUser]        = useState<AdminUser | null>(null)
  const [userDetailListings,  setUserDetailListings]  = useState<AdminListing[]>([])
  const [userDetailLoading,   setUserDetailLoading]   = useState(false)
  const [userDetailOfferCount,setUserDetailOfferCount]= useState(0)
  const [userDetailOrderCount,setUserDetailOrderCount]= useState(0)

  // Admin user ID + chat drawer
  const [adminUserId, setAdminUserId] = useState<string | null>(null)
  const [chatTarget,  setChatTarget]  = useState<{
    userId: string; listingId: string; userName: string
    listingTitle: string; listingPrice: number; listingImage?: string
  } | null>(null)

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
  const loadDashboard = useCallback(async () => {
    setLoading(true)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayIso = today.toISOString()

    const [
      { count: todayOffers },
      { count: todayOrders },
      { count: todayUsers },
      { count: totalActiveListings },
      { count: totalPendingOrders },
      { count: totalUsers },
    ] = await Promise.all([
      supabase.from('offers').select('*', { count: 'exact', head: true }).gte('created_at', todayIso),
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', todayIso),
      supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', todayIso),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('users').select('*', { count: 'exact', head: true }),
    ])

    setStats({
      today_offers:          todayOffers          ?? 0,
      today_orders:          todayOrders          ?? 0,
      today_users:           todayUsers           ?? 0,
      total_active_listings: totalActiveListings  ?? 0,
      total_pending_orders:  totalPendingOrders   ?? 0,
      total_users:           totalUsers           ?? 0,
    })
    setLoading(false)
  }, [])

  const loadTracking = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('offers')
      .select(`
        id, listing_id, buyer_id, offered_price, counter_price, status, created_at,
        listings:listing_id(id, title_az, images, price, seller_id),
        buyers:buyer_id(id, full_name, email, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!data) { setLoading(false); return }

    const sellerIds = [...new Set((data as any[]).map((o: any) => o.listings?.seller_id).filter(Boolean))]
    const sellersMap = new Map<string, any>()
    if (sellerIds.length > 0) {
      const { data: sellersData } = await supabase
        .from('users').select('id, full_name, email, avatar_url').in('id', sellerIds)
      for (const s of sellersData ?? []) sellersMap.set(s.id, s)
    }

    setTrackingDeals((data as any[]).map((o: any) => {
      const seller = sellersMap.get(o.listings?.seller_id)
      return {
        offer_id:      o.id,
        listing_id:    o.listing_id,
        listing_title: o.listings?.title_az    ?? 'Elan',
        listing_image: o.listings?.images?.[0] ?? null,
        listing_price: o.listings?.price       ?? 0,
        buyer_id:      o.buyer_id,
        buyer_name:    o.buyers?.full_name  || o.buyers?.email?.split('@')[0]  || 'Alıcı',
        buyer_avatar:  o.buyers?.avatar_url ?? null,
        seller_id:     o.listings?.seller_id   ?? '',
        seller_name:   seller?.full_name    || seller?.email?.split('@')[0]    || 'Satıcı',
        seller_avatar: seller?.avatar_url   ?? null,
        offered_price: o.offered_price,
        counter_price: o.counter_price      ?? null,
        status:        o.status,
        created_at:    o.created_at,
      }
    }))
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
        id:           l.id,
        title_az:     l.title_az,
        images:       l.images ?? [],
        price:        l.price,
        status:       l.status,
        views:        l.views ?? 0,
        basket_count: l.basket_count ?? 0,
        created_at:   l.created_at,
        seller_id:    l.seller_id,
        seller_name:  l.users?.full_name || l.users?.email?.split('@')[0] || 'Satıcı',
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

    const ids = uData.map((u: any) => u.id)
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
      setOrders(data.map((o: any) => ({
        id:               o.id,
        listing_id:       o.listing_id,
        listing_title:    o.listings?.title_az ?? 'Elan',
        listing_image:    o.listings?.images?.[0] ?? null,
        buyer_id:         o.buyer_id,
        buyer_name:       o.buyers?.full_name  || o.buyers?.email?.split('@')[0]  || 'Alıcı',
        seller_id:        o.seller_id,
        seller_name:      o.sellers?.full_name || o.sellers?.email?.split('@')[0] || 'Satıcı',
        final_price:      o.final_price,
        delivery_needed:  o.delivery_needed  ?? false,
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
    if (tab === 'dashboard') loadDashboard()
    if (tab === 'tracking')  loadTracking()
    if (tab === 'listings')  loadListings()
    if (tab === 'users')     loadUsers()
    if (tab === 'orders')    loadOrders()
  }, [authed, tab, loadDashboard, loadTracking, loadListings, loadUsers, loadOrders])

  // Fetch unseen order count badge on mount
  useEffect(() => {
    if (!authed) return
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('is_seen', false)
      .then(({ count }) => setUnseenCount(count ?? 0))
  }, [authed])

  // ── User detail panel loader ──────────────────────────────────────────────────
  async function openUserDetail(user: AdminUser) {
    setSelectedUser(user)
    setUserDetailLoading(true)
    setUserDetailListings([])
    setUserDetailOfferCount(0)
    setUserDetailOrderCount(0)

    const [{ data: lData }, { count: offerCount }, { count: orderCount }] = await Promise.all([
      supabase.from('listings').select('*').eq('seller_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('offers').select('*', { count: 'exact', head: true }).eq('buyer_id', user.id),
      supabase.from('orders').select('*', { count: 'exact', head: true }).eq('buyer_id', user.id),
    ])

    if (lData) {
      setUserDetailListings(lData.map((l: any) => ({
        id: l.id, title_az: l.title_az, images: l.images ?? [],
        price: l.price, status: l.status, views: l.views ?? 0,
        basket_count: l.basket_count ?? 0, created_at: l.created_at,
        seller_id: user.id, seller_name: user.full_name || user.email?.split('@')[0] || 'Satıcı',
      })))
    }
    setUserDetailOfferCount(offerCount ?? 0)
    setUserDetailOrderCount(orderCount ?? 0)
    setUserDetailLoading(false)
  }

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
    if (selectedUser?.id === user.id) setSelectedUser({ ...selectedUser, is_banned: newBanned })
  }

  async function updateOrderStatus(id: string, status: string) {
    await supabase.from('orders').update({ status, is_seen: true }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status, is_seen: true } : o))
    setUnseenCount(prev => Math.max(0, prev - 1))
  }

  async function deleteOffer(offerId: string) {
    await supabase.from('offers').delete().eq('id', offerId)
    setTrackingDeals(prev => prev.filter(d => d.offer_id !== offerId))
  }

  async function deleteAllOffers() {
    if (!confirm('Bütün tracking məlumatlarını silmək istədiyinizə əminsiniz?')) return
    const ids = trackingDeals.map(d => d.offer_id)
    if (ids.length > 0) await supabase.from('offers').delete().in('id', ids)
    setTrackingDeals([])
  }

  async function markOrdersSeen() {
    await supabase.from('orders').update({ is_seen: true }).eq('is_seen', false)
    setOrders(prev => prev.map(o => ({ ...o, is_seen: true })))
    setUnseenCount(0)
  }

  // ── Guard ─────────────────────────────────────────────────────────────────────
  if (!authed) return null

  const TABS = [
    { key: 'dashboard', icon: '📊', label: 'İcmal',          badge: 0            },
    { key: 'tracking',  icon: '🔄', label: 'Tracking',       badge: 0            },
    { key: 'messages',  icon: '💬', label: 'Mesajlar',       badge: 0            },
    { key: 'listings',  icon: '📦', label: 'Elanlar',        badge: 0            },
    { key: 'users',     icon: '👥', label: 'İstifadəçilər',  badge: 0            },
    { key: 'orders',    icon: '🛒', label: 'Sifarişlər',     badge: unseenCount  },
    { key: 'reports',   icon: '🚨', label: 'Şikayətlər',     badge: 0            },
  ] as const

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

  // ── Timeline helper ───────────────────────────────────────────────────────────
  function DealTimeline({ deal }: { deal: TrackingDeal }) {
    const steps: { icon: string; label: string; color: string }[] = [
      { icon: '💰', label: `${deal.offered_price} ₼ Təklif`, color: '#FF2D78' },
    ]
    if (deal.counter_price) {
      steps.push({ icon: '↩', label: `${deal.counter_price} ₼ Əks-təklif`, color: '#f97316' })
    }
    if (deal.status === 'accepted') {
      steps.push({ icon: '✓', label: 'Qəbul edildi', color: '#10b981' })
    } else if (deal.status === 'rejected') {
      steps.push({ icon: '✗', label: 'Rədd edildi', color: '#ef4444' })
    } else if (deal.status === 'countered') {
      steps.push({ icon: '↩', label: 'Cavab gözlənilir', color: '#f97316' })
    }

    return (
      <div className="flex items-center gap-1 flex-wrap">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-300 text-xs">→</span>}
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: s.color + '15', color: s.color, border: `1px solid ${s.color}40` }}
            >
              {s.icon} {s.label}
            </span>
          </div>
        ))}
      </div>
    )
  }

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
                className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1"
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

          {loading && tab !== 'messages' && (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
              Yüklənir...
            </div>
          )}

          {/* ── DASHBOARD TAB ── */}
          {!loading && tab === 'dashboard' && stats && (
            <div className="flex flex-col gap-6">
              {/* Today */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Bugün</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Yeni Təkliflər',  value: stats.today_offers, icon: '💰', color: '#FF2D78', bg: '#FFF5F8' },
                    { label: 'Yeni Sifarişlər', value: stats.today_orders, icon: '🛒', color: '#3b82f6', bg: '#eff6ff' },
                    { label: 'Yeni İstifadəçi', value: stats.today_users,  icon: '👤', color: '#8b5cf6', bg: '#f5f3ff' },
                  ].map(card => (
                    <div
                      key={card.label}
                      className="rounded-2xl p-5 flex flex-col gap-2"
                      style={{ backgroundColor: 'white', border: '1.5px solid #e5e7eb' }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ backgroundColor: card.bg }}
                      >
                        {card.icon}
                      </div>
                      <p className="text-3xl font-bold" style={{ color: card.color }}>{card.value}</p>
                      <p className="text-xs text-gray-400">{card.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Ümumi</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Aktiv Elanlar',      value: stats.total_active_listings, icon: '📦', color: '#10b981', bg: '#f0fdf4' },
                    { label: 'Gözlənilən Sifarişlər', value: stats.total_pending_orders, icon: '⏳', color: '#d97706', bg: '#fffbeb' },
                    { label: 'Ümumi İstifadəçi',   value: stats.total_users,           icon: '👥', color: '#1a1040', bg: '#f5f5f5' },
                  ].map(card => (
                    <div
                      key={card.label}
                      className="rounded-2xl p-5 flex flex-col gap-2"
                      style={{ backgroundColor: 'white', border: '1.5px solid #e5e7eb' }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                        style={{ backgroundColor: card.bg }}
                      >
                        {card.icon}
                      </div>
                      <p className="text-3xl font-bold" style={{ color: card.color }}>{card.value}</p>
                      <p className="text-xs text-gray-400">{card.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── TRACKING TAB ── */}
          {!loading && tab === 'tracking' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{trackingDeals.length} təklif</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadTracking}
                    className="text-xs px-3 py-1.5 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
                    style={{ border: '1px solid #e5e7eb' }}
                  >
                    ↻ Yenilə
                  </button>
                  {trackingDeals.length > 0 && (
                    <button
                      onClick={deleteAllOffers}
                      className="text-xs px-3 py-1.5 rounded-full font-semibold hover:bg-red-50 transition-colors"
                      style={{ color: '#ef4444', border: '1px solid #fecaca' }}
                    >
                      🗑 Hamısını sil
                    </button>
                  )}
                </div>
              </div>

              {trackingDeals.length === 0 && (
                <div className="py-16 text-center text-gray-400 text-sm">Hələ təklif yoxdur</div>
              )}

              {trackingDeals.map(deal => (
                <div
                  key={deal.offer_id}
                  className="rounded-2xl p-4 flex flex-col gap-3"
                  style={{ backgroundColor: 'white', border: '1.5px solid #e5e7eb' }}
                >
                  {/* Top row: listing + status + delete */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                      {deal.listing_image ? (
                        <Image src={deal.listing_image} alt={deal.listing_title} width={48} height={56} className="object-cover w-full h-full" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">👗</div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <a
                        href={`/listing/${deal.listing_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-semibold hover:underline line-clamp-1"
                        style={{ color: '#1a1040' }}
                      >
                        {deal.listing_title}
                      </a>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs line-through text-gray-400">{deal.listing_price} ₼</span>
                        <span className="text-sm font-bold" style={{ color: '#FF2D78' }}>{deal.offered_price} ₼</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={
                          deal.status === 'pending'   ? { backgroundColor: '#fffbeb', color: '#d97706' } :
                          deal.status === 'accepted'  ? { backgroundColor: '#f0fdf4', color: '#16a34a' } :
                          deal.status === 'rejected'  ? { backgroundColor: '#fef2f2', color: '#ef4444' } :
                                                        { backgroundColor: '#fff7ed', color: '#f97316' }
                        }
                      >
                        {deal.status === 'pending'   ? 'Gözlənilir' :
                         deal.status === 'accepted'  ? 'Qəbul edildi' :
                         deal.status === 'rejected'  ? 'Rədd edildi' : 'Əks-təklif'}
                      </span>
                      <button
                        onClick={() => deleteOffer(deal.offer_id)}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-lg hover:bg-red-50 transition-colors"
                        style={{ color: '#ef4444', border: '1px solid #fecaca' }}
                      >
                        🗑 Sil
                      </button>
                    </div>
                  </div>

                  {/* Parties */}
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      onClick={() => openUserDetail({ id: deal.buyer_id, email: null, full_name: deal.buyer_name, avatar_url: deal.buyer_avatar, is_seller: false, is_banned: false, created_at: deal.created_at, listing_count: 0, message_count: 0 })}
                      className="flex items-center gap-1.5 hover:underline"
                      style={{ color: '#1a1040' }}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {deal.buyer_avatar ? <Image src={deal.buyer_avatar} alt={deal.buyer_name} width={24} height={24} className="object-cover w-full h-full" unoptimized /> : deal.buyer_name[0].toUpperCase()}
                      </div>
                      <span className="font-semibold">👤 {deal.buyer_name}</span>
                    </button>
                    <span className="text-gray-300">→</span>
                    <button
                      onClick={() => openUserDetail({ id: deal.seller_id, email: null, full_name: deal.seller_name, avatar_url: deal.seller_avatar, is_seller: true, is_banned: false, created_at: deal.created_at, listing_count: 0, message_count: 0 })}
                      className="flex items-center gap-1.5 hover:underline"
                      style={{ color: '#1a1040' }}
                    >
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 overflow-hidden flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                        {deal.seller_avatar ? <Image src={deal.seller_avatar} alt={deal.seller_name} width={24} height={24} className="object-cover w-full h-full" unoptimized /> : deal.seller_name[0].toUpperCase()}
                      </div>
                      <span className="font-semibold">🏷 {deal.seller_name}</span>
                    </button>
                    <span className="text-gray-300 text-[10px] ml-auto">{fmt(deal.created_at)}</span>
                  </div>

                  {/* Timeline */}
                  <DealTimeline deal={deal} />

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
                    <button
                      onClick={() => setChatTarget({ userId: deal.buyer_id, listingId: deal.listing_id, userName: deal.buyer_name, listingTitle: deal.listing_title, listingPrice: deal.offered_price, listingImage: deal.listing_image ?? undefined })}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-pink-50 transition-colors"
                      style={{ color: '#FF2D78', border: '1px solid #fecdd3' }}
                    >
                      💬 Alıcıya yaz
                    </button>
                    <button
                      onClick={() => setChatTarget({ userId: deal.seller_id, listingId: deal.listing_id, userName: deal.seller_name, listingTitle: deal.listing_title, listingPrice: deal.offered_price, listingImage: deal.listing_image ?? undefined })}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-yellow-50 transition-colors"
                      style={{ color: '#d97706', border: '1px solid #fde68a' }}
                    >
                      💬 Satıcıya yaz
                    </button>
                    <button
                      onClick={() => openUserDetail({ id: deal.buyer_id, email: null, full_name: deal.buyer_name, avatar_url: deal.buyer_avatar, is_seller: false, is_banned: false, created_at: deal.created_at, listing_count: 0, message_count: 0 })}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                      style={{ color: '#6b7280', border: '1px solid #e5e7eb' }}
                    >
                      👤 Alıcı profili
                    </button>
                    <button
                      onClick={() => openUserDetail({ id: deal.seller_id, email: null, full_name: deal.seller_name, avatar_url: deal.seller_avatar, is_seller: true, is_banned: false, created_at: deal.created_at, listing_count: 0, message_count: 0 })}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                      style={{ color: '#6b7280', border: '1px solid #e5e7eb' }}
                    >
                      👤 Satıcı profili
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── MESSAGES TAB ── */}
          {tab === 'messages' && adminUserId && (
            <div style={{ height: 'calc(100vh - 160px)', minHeight: 500 }}>
              <MessagesUI currentUserId={adminUserId} isAdmin={true} />
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

              <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}>
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
                      <tr key={l.id} style={{ borderBottom: i < filteredListings.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                              {l.images[0] ? (
                                <Image src={l.images[0]} alt={l.title_az} width={40} height={48} className="object-cover w-full h-full" unoptimized />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-base">👗</div>
                              )}
                            </div>
                            <a href={`/listing/${l.id}`} target="_blank" rel="noreferrer"
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
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={
                              l.status === 'active' ? { backgroundColor: '#e8fdf5', color: '#10b981' } :
                              l.status === 'sold'   ? { backgroundColor: '#eff6ff', color: '#3b82f6' } :
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
                              <button onClick={() => archiveListing(l.id)}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-gray-100"
                                style={{ color: '#6b7280', border: '1px solid #e5e7eb' }}
                              >Arxivlə</button>
                            ) : (
                              <button onClick={() => restoreListing(l.id)}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-green-50"
                                style={{ color: '#10b981', border: '1px solid #d1fae5' }}
                              >Bərpa et</button>
                            )}
                            <button onClick={() => deleteListing(l.id)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-red-50"
                              style={{ color: '#ef4444', border: '1px solid #fee2e2' }}
                            >Sil</button>
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

              <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}>
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
                      <tr key={u.id} style={{
                        borderBottom: i < filteredUsers.length - 1 ? '1px solid #f9fafb' : 'none',
                        backgroundColor: u.is_banned ? '#fff5f5' : 'transparent',
                      }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 overflow-hidden flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                              {u.avatar_url ? (
                                <Image src={u.avatar_url} alt={u.full_name ?? ''} width={32} height={32} className="object-cover w-full h-full" unoptimized />
                              ) : (u.full_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                            </div>
                            <button
                              onClick={() => openUserDetail(u)}
                              className="text-xs font-semibold hover:underline text-left"
                              style={{ color: '#1a1040' }}
                            >
                              {u.full_name || '—'}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{u.email ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(u.created_at)}</td>
                        <td className="px-4 py-3 text-xs font-semibold" style={{ color: '#1a1040' }}>{u.listing_count}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{u.message_count}</td>
                        <td className="px-4 py-3">
                          {u.is_banned ? (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>Banlı</span>
                          ) : (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f0fdf4', color: '#22c55e' }}>Aktiv</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openUserDetail(u)}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors hover:bg-gray-100"
                              style={{ color: '#6b7280', border: '1px solid #e5e7eb' }}
                            >
                              👤 Profil
                            </button>
                            {u.email !== ADMIN_EMAIL && (
                              <button
                                onClick={() => toggleBan(u)}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
                                style={
                                  u.is_banned
                                    ? { color: '#22c55e', border: '1px solid #d1fae5' }
                                    : { color: '#ef4444', border: '1px solid #fee2e2' }
                                }
                              >
                                {u.is_banned ? 'Banı aç' : 'Ban et'}
                              </button>
                            )}
                          </div>
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
                  <button onClick={markOrdersSeen}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full transition-colors hover:bg-gray-100"
                    style={{ border: '1px solid #e5e7eb', color: '#6b7280' }}
                  >
                    Hamısını oxunmuş işarələ
                  </button>
                )}
              </div>

              <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}>
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
                      <tr key={o.id} style={{
                        borderBottom: i < orders.length - 1 ? '1px solid #f9fafb' : 'none',
                        backgroundColor: !o.is_seen ? '#fffbeb' : 'transparent',
                      }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                              {o.listing_image ? (
                                <Image src={o.listing_image} alt={o.listing_title} width={32} height={40} className="object-cover w-full h-full" unoptimized />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-sm">👗</div>
                              )}
                            </div>
                            <a href={`/listing/${o.listing_id}`} target="_blank" rel="noreferrer"
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
                        <td className="px-4 py-3 text-xs font-bold" style={{ color: '#FF2D78' }}>{o.final_price} ₼</td>
                        <td className="px-4 py-3 text-xs">
                          {o.delivery_needed ? (
                            <div>
                              <span className="font-semibold text-green-600">Hə</span>
                              {o.delivery_address && <div className="text-gray-400 mt-0.5 max-w-[120px] truncate">{o.delivery_address}</div>}
                            </div>
                          ) : <span className="text-gray-400">Xeyr</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">{o.phone}</td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                            style={
                              o.status === 'pending'   ? { backgroundColor: '#fffbeb', color: '#d97706' } :
                              o.status === 'confirmed' ? { backgroundColor: '#eff6ff', color: '#3b82f6' } :
                              o.status === 'delivered' ? { backgroundColor: '#f0fdf4', color: '#16a34a' } :
                                                         { backgroundColor: '#fef2f2', color: '#ef4444' }
                            }
                          >
                            {o.status === 'pending' ? 'Gözlənilir' : o.status === 'confirmed' ? 'Təsdiqləndi' : o.status === 'delivered' ? 'Çatdırıldı' : 'Ləğv edildi'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(o.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5">
                            {o.status === 'pending' && (
                              <button onClick={() => updateOrderStatus(o.id, 'confirmed')}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                                style={{ color: '#3b82f6', border: '1px solid #bfdbfe' }}
                              >Təsdiqlə</button>
                            )}
                            {(o.status === 'pending' || o.status === 'confirmed') && (
                              <button onClick={() => updateOrderStatus(o.id, 'delivered')}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-green-50 transition-colors"
                                style={{ color: '#16a34a', border: '1px solid #bbf7d0' }}
                              >Çatdırıldı</button>
                            )}
                            {o.status !== 'cancelled' && o.status !== 'delivered' && (
                              <button onClick={() => updateOrderStatus(o.id, 'cancelled')}
                                className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                                style={{ color: '#ef4444', border: '1px solid #fecaca' }}
                              >Ləğv et</button>
                            )}
                            <button
                              onClick={() => setChatTarget({ userId: o.buyer_id, listingId: o.listing_id, userName: o.buyer_name, listingTitle: o.listing_title, listingPrice: o.final_price, listingImage: o.listing_image ?? undefined })}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-pink-50 transition-colors"
                              style={{ color: '#FF2D78', border: '1px solid #fecdd3' }}
                            >💬 Alıcıya yaz</button>
                            <button
                              onClick={() => setChatTarget({ userId: o.seller_id, listingId: o.listing_id, userName: o.seller_name, listingTitle: o.listing_title, listingPrice: o.final_price, listingImage: o.listing_image ?? undefined })}
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg hover:bg-yellow-50 transition-colors"
                              style={{ color: '#d97706', border: '1px solid #fde68a' }}
                            >💬 Satıcıya yaz</button>
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

      {/* ── User Detail Panel (slide-in from right) ── */}
      {selectedUser && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
            onClick={() => setSelectedUser(null)}
          />

          {/* Panel */}
          <aside
            className="fixed top-0 right-0 h-full w-80 z-50 flex flex-col overflow-hidden"
            style={{ backgroundColor: 'white', borderLeft: '2px solid #1a1040', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #f3f4f6' }}>
              <p className="font-bold text-sm" style={{ color: '#1a1040' }}>İstifadəçi Profili</p>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-light leading-none"
              >×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {/* Avatar + name */}
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 overflow-hidden flex items-center justify-center text-2xl font-bold text-white">
                  {selectedUser.avatar_url ? (
                    <Image src={selectedUser.avatar_url} alt={selectedUser.full_name ?? ''} width={64} height={64} className="object-cover w-full h-full" unoptimized />
                  ) : (selectedUser.full_name?.[0] || selectedUser.email?.[0] || '?').toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="font-bold text-base" style={{ color: '#1a1040' }}>{selectedUser.full_name || '—'}</p>
                  {selectedUser.email && <p className="text-xs text-gray-400 mt-0.5">{selectedUser.email}</p>}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    {selectedUser.is_seller && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FFF5F8', color: '#FF2D78', border: '1px solid #fecdd3' }}>
                        Satıcı
                      </span>
                    )}
                    {selectedUser.is_banned && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
                        🚫 Banlı
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="flex flex-col gap-2 text-xs">
                {selectedUser.created_at && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-400">Qeydiyyat</span>
                    <span className="font-semibold" style={{ color: '#1a1040' }}>{fmtDate(selectedUser.created_at)}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              {!userDetailLoading && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Elanlar',  value: userDetailListings.length, icon: '📦' },
                    { label: 'Təkliflər', value: userDetailOfferCount,    icon: '💰' },
                    { label: 'Sifarişlər', value: userDetailOrderCount,   icon: '🛒' },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: '#f9fafb', border: '1px solid #f3f4f6' }}>
                      <div className="text-base">{s.icon}</div>
                      <div className="text-lg font-bold mt-0.5" style={{ color: '#1a1040' }}>{s.value}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {userDetailLoading && (
                <div className="text-center text-sm text-gray-400 py-4">Yüklənir...</div>
              )}

              {/* Active listings */}
              {!userDetailLoading && userDetailListings.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Aktiv Elanlar</p>
                  <div className="grid grid-cols-3 gap-2">
                    {userDetailListings.filter(l => l.status === 'active').slice(0, 9).map(l => (
                      <a key={l.id} href={`/listing/${l.id}`} target="_blank" rel="noreferrer"
                        className="rounded-xl overflow-hidden group"
                        style={{ border: '1px solid #e5e7eb' }}
                      >
                        <div className="relative aspect-square bg-gray-100">
                          {l.images[0] ? (
                            <Image src={l.images[0]} alt={l.title_az} fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xl">👗</div>
                          )}
                        </div>
                        <div className="px-1.5 py-1">
                          <p className="text-[10px] font-bold" style={{ color: '#FF2D78' }}>{l.price} ₼</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 p-4 flex-shrink-0" style={{ borderTop: '1px solid #f3f4f6' }}>
              {adminUserId && userDetailListings.length > 0 && (
                <button
                  onClick={() => {
                    setChatTarget({
                      userId: selectedUser.id,
                      listingId: userDetailListings[0].id,
                      userName: selectedUser.full_name || selectedUser.email?.split('@')[0] || 'İstifadəçi',
                      listingTitle: userDetailListings[0].title_az,
                      listingPrice: userDetailListings[0].price,
                      listingImage: userDetailListings[0].images[0],
                    })
                    setSelectedUser(null)
                  }}
                  className="w-full py-2.5 rounded-xl font-bold text-white text-sm"
                  style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040' }}
                >
                  💬 Mesaj göndər
                </button>
              )}
              {selectedUser.email !== ADMIN_EMAIL && (
                <button
                  onClick={() => toggleBan(selectedUser)}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm transition-colors"
                  style={
                    selectedUser.is_banned
                      ? { color: '#22c55e', border: '2px solid #d1fae5', backgroundColor: 'transparent' }
                      : { color: '#ef4444', border: '2px solid #fee2e2', backgroundColor: 'transparent' }
                  }
                >
                  {selectedUser.is_banned ? '✓ Banı aç' : '🚫 Ban et'}
                </button>
              )}
            </div>
          </aside>
        </>
      )}

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
