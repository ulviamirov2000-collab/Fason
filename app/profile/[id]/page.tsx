'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { UserRow, ListingRow } from '@/lib/supabase'

const statusConfig = {
  active:   { label: 'Aktiv',    bg: '#E8FFF8', color: '#00856F', border: '#00E5CC' },
  sold:     { label: 'Satıldı',  bg: '#FFF0F5', color: '#CC0044', border: '#FF2D78' },
  archived: { label: 'Arxivdə', bg: '#F5F5F5', color: '#666',    border: '#ccc'    },
}

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [profileUser, setProfileUser] = useState<UserRow | null>(null)
  const [listings, setListings] = useState<ListingRow[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit name
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setCurrentUserId(authUser?.id ?? null)

      // Fetch profile from public.users
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (userData) {
        setProfileUser(userData)
        setEditName(userData.full_name ?? '')
      } else if (authUser && authUser.id === id) {
        const fallback: UserRow = {
          id: authUser.id,
          email: authUser.email ?? null,
          phone: null,
          full_name: authUser.user_metadata?.full_name ?? null,
          avatar_url: null,
          is_seller: false,
          created_at: authUser.created_at,
        }
        await supabase.from('users').upsert(fallback, { onConflict: 'id' })
        setProfileUser(fallback)
        setEditName(fallback.full_name ?? '')
      }

      // Fetch ALL listings for owner, active only for others
      const isOwner = authUser?.id === id
      const query = supabase
        .from('listings')
        .select('*')
        .eq('seller_id', id)
        .order('created_at', { ascending: false })

      const { data: listingData } = isOwner
        ? await query
        : await query.eq('status', 'active')

      setListings(listingData ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  async function saveProfile() {
    if (!currentUserId) {
      console.warn('[saveProfile] no currentUserId')
      showToast('Xəta: istifadəçi tapılmadı')
      return
    }
    const newName = editName.trim()
    setSaving(true)

    const { data, error } = await supabase
      .from('users')
      .update({ full_name: newName })
      .eq('id', currentUserId)
      .select()
      .single()

    console.log('[saveProfile] response:', { data, error })

    setSaving(false)
    if (error) {
      showToast(`Xəta: ${error.message}`)
      return
    }
    // Update local state immediately — do not re-fetch
    setProfileUser((prev) => prev ? { ...prev, full_name: newName } : prev)
    setEditName(newName)
    setEditMode(false)
    showToast('Ad uğurla yeniləndi ✓')
  }

  async function setListingStatus(listingId: string, status: 'archived' | 'sold') {
    const { error } = await supabase
      .from('listings')
      .update({ status })
      .eq('id', listingId)
    if (error) { showToast('Xəta baş verdi'); return }
    setListings((prev) =>
      prev.map((l) => l.id === listingId ? { ...l, status } : l)
    )
    showToast(status === 'archived' ? 'Elan silindi' : 'Satıldı kimi işarələndi ✓')
  }

  const isOwner = currentUserId === id

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-gray-400 text-sm">Yüklənir...</div>
      </main>
    )
  }

  if (!profileUser) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-4xl mb-3">🔍</div>
        <div className="text-gray-700 font-semibold mb-1">Profil tapılmadı</div>
        <div className="text-gray-400 text-sm mb-5">
          Bu istifadəçi hələ qeydiyyatdan keçməyib və ya profil mövcud deyil.
        </div>
        <Link
          href="/"
          className="inline-block px-5 py-2.5 rounded-full text-sm font-bold text-white"
          style={{ backgroundColor: '#FF2D78' }}
        >
          Ana səhifəyə qayıt
        </Link>
      </main>
    )
  }

  const displayName = profileUser.full_name || profileUser.email?.split('@')[0] || 'İstifadəçi'
  const joinYear = new Date(profileUser.created_at).getFullYear()
  const activeCount = listings.filter((l) => l.status === 'active').length

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg transition-all"
          style={{ backgroundColor: '#1a1040', color: 'white', border: '2px solid #FFE600' }}
        >
          {toast}
        </div>
      )}

      {/* Profile header */}
      <div
        className="rounded-3xl p-6 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-5"
        style={{ backgroundColor: '#1a1040', border: '2px solid #1a1040' }}
      >
        {/* Avatar */}
        <div
          className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-3xl font-bold text-white flex-shrink-0"
          style={{ border: '3px solid #FFE600' }}
        >
          {displayName[0].toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 text-center sm:text-left min-w-0">
          {editMode ? (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 min-w-0 px-3 py-1.5 rounded-xl text-sm text-white outline-none bg-transparent"
                style={{ border: '2px solid #FFE600' }}
              />
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 flex-shrink-0"
                style={{ backgroundColor: '#FFE600', color: '#1a1040' }}
              >
                {saving ? '...' : 'Saxla'}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-white/60 border border-white/20 flex-shrink-0"
              >
                Ləğv et
              </button>
            </div>
          ) : (
            <h1
              className="text-2xl font-bold text-white"
              style={{ fontFamily: 'var(--font-unbounded)' }}
            >
              {displayName}
            </h1>
          )}
          {profileUser.email && (
            <p className="text-white/40 text-xs mt-1 truncate">{profileUser.email}</p>
          )}
          {profileUser.is_seller && (
            <span
              className="inline-block mt-1 text-xs font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: '#FFE600', color: '#1a1040' }}
            >
              ✓ Satıcı
            </span>
          )}
          <p className="text-white/50 text-xs mt-2">{joinYear}-dən FASON üzvü</p>
        </div>

        {/* Stats + edit */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: '#FFE600', fontFamily: 'var(--font-unbounded)' }}
            >
              {activeCount}
            </div>
            <div className="text-white/50 text-xs">Aktiv elan</div>
          </div>
          {isOwner && !editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-80"
              style={{ border: '2px solid #FFE600', color: '#FFE600' }}
            >
              ✏️ Redaktə
            </button>
          )}
        </div>
      </div>

      {/* Listings section */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-lg font-bold"
            style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
          >
            {isOwner ? 'Elanlarım' : 'Aktiv elanlar'}
          </h2>
          {isOwner && (
            <Link
              href="/sell"
              className="px-4 py-2 rounded-full text-xs font-bold text-white transition-transform hover:scale-105"
              style={{ backgroundColor: '#FF2D78' }}
            >
              + Yeni elan
            </Link>
          )}
        </div>

        {listings.length === 0 ? (
          <div
            className="text-center py-16 rounded-2xl"
            style={{ border: '2px dashed #ccc' }}
          >
            <p className="text-gray-400 text-sm">Hələ elan yoxdur.</p>
          </div>
        ) : isOwner ? (
          /* Owner dashboard grid with status badges + action buttons */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {listings.map((listing) => {
              const cfg = statusConfig[listing.status as keyof typeof statusConfig] ?? statusConfig.active
              const mainImage = listing.images?.[0]
              return (
                <div
                  key={listing.id}
                  className="flex gap-3 bg-white rounded-2xl p-3"
                  style={{ border: '2px solid #1a1040' }}
                >
                  {/* Thumbnail */}
                  <div
                    className="w-20 h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-pink-100 to-yellow-100 flex items-center justify-center"
                    style={{ border: '1.5px solid #e5e7eb' }}
                  >
                    {mainImage ? (
                      <Image
                        src={mainImage}
                        alt={listing.title_az}
                        width={80}
                        height={96}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-2xl">👗</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/listing/${listing.id}`}
                          className="text-sm font-semibold truncate hover:underline"
                          style={{ color: '#1a1040' }}
                        >
                          {listing.title_az}
                        </Link>
                        {/* Status badge */}
                        <span
                          className="flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1.5px solid ${cfg.border}` }}
                        >
                          {cfg.label}
                        </span>
                      </div>
                      <div
                        className="mt-1 text-sm font-bold"
                        style={{ color: '#FF2D78' }}
                      >
                        {listing.price} ₼
                      </div>
                      {listing.brand && (
                        <div className="text-xs text-gray-400 mt-0.5">{listing.brand}</div>
                      )}
                    </div>

                    {/* Action buttons — only for active listings */}
                    {listing.status === 'active' && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setListingStatus(listing.id, 'sold')}
                          className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                          style={{ backgroundColor: '#00E5CC', color: '#1a1040', border: '1.5px solid #1a1040' }}
                        >
                          Satıldı
                        </button>
                        <button
                          onClick={() => setListingStatus(listing.id, 'archived')}
                          className="flex-1 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80"
                          style={{ backgroundColor: '#FAF7F2', color: '#FF2D78', border: '1.5px solid #FF2D78' }}
                        >
                          Sil
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* Public view — simple masonry */
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
            {listings.filter((l) => l.status === 'active').map((listing) => {
              const displayNameFallback = profileUser.full_name || profileUser.email?.split('@')[0] || 'Satıcı'
              return (
                <div key={listing.id} className="break-inside-avoid">
                  <Link href={`/listing/${listing.id}`}>
                    <div
                      className="bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.03] hover:shadow-xl"
                      style={{ border: '2px solid #1a1040' }}
                    >
                      <div className="relative w-full aspect-[3/4] bg-gray-100 flex items-center justify-center">
                        {listing.images?.[0] ? (
                          <Image src={listing.images[0]} alt={listing.title_az} fill className="object-cover" />
                        ) : (
                          <span className="text-4xl">👗</span>
                        )}
                        <div
                          className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold text-black"
                          style={{ backgroundColor: '#FFE600', border: '1.5px solid #1a1040' }}
                        >
                          {listing.price} ₼
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-sm text-gray-900 truncate">{listing.title_az}</p>
                        {listing.brand && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block"
                            style={{ backgroundColor: '#FAF7F2', border: '1px solid #1a1040' }}
                          >
                            {listing.brand}
                          </span>
                        )}
                        <div className="text-xs text-gray-400 mt-1">{displayNameFallback}</div>
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
