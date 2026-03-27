'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import type { UserRow, ListingRow } from '@/lib/supabase'
import { sanitize } from '@/lib/sanitize'
import MessagesUI from '@/components/MessagesUI'

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

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

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
    const newName = sanitize(editName)
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

  async function uploadAvatar(file: File) {
    if (!currentUserId) return
    setAvatarUploading(true)
    const path = `${currentUserId}/avatar.jpg`
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { contentType: file.type, upsert: true })
    if (error || !data) {
      showToast(`Xəta: ${error?.message ?? 'Yüklənmədi'}`)
      setAvatarUploading(false)
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    // Bust cache by appending timestamp
    const urlWithBust = `${publicUrl}?t=${Date.now()}`
    await supabase.from('users').update({ avatar_url: urlWithBust }).eq('id', currentUserId)
    setProfileUser((prev) => prev ? { ...prev, avatar_url: urlWithBust } : prev)
    setAvatarUploading(false)
    showToast('Foto yeniləndi ✓')
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
  const [activeTab, setActiveTab] = useState<'listings' | 'messages'>('listings')

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
        <div className="relative flex-shrink-0">
          {/* Hidden file input */}
          {isOwner && (
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) uploadAvatar(file)
                e.target.value = ''
              }}
            />
          )}

          {/* Avatar circle */}
          <div
            className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-3xl font-bold text-white"
            style={{ border: '3px solid #FFE600' }}
          >
            {profileUser.avatar_url ? (
              <Image
                src={profileUser.avatar_url}
                alt={displayName}
                width={80}
                height={80}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <span>{displayName[0].toUpperCase()}</span>
            )}
          </div>

          {/* Uploading spinner overlay */}
          {avatarUploading && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(26,16,64,0.65)' }}>
              <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </div>
          )}

          {/* Camera button overlay — owner only, hidden while uploading */}
          {isOwner && !avatarUploading && (
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
              style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040' }}
              aria-label="Foto dəyiş"
            >
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
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

      {/* Tabs — owner sees Elanlarım + Mesajlar, others see just Aktiv elanlar */}
      <div>
        {isOwner ? (
          <div className="flex items-center gap-2 mb-5">
            {(['listings', 'messages'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="px-4 py-2 rounded-full text-sm font-bold transition-all"
                style={
                  activeTab === tab
                    ? { backgroundColor: '#FF2D78', color: 'white', border: '2px solid #1a1040' }
                    : { backgroundColor: 'white', color: '#1a1040', border: '2px solid #ccc' }
                }
              >
                {tab === 'listings' ? 'Elanlarım' : '💬 Mesajlar'}
              </button>
            ))}
            {activeTab === 'listings' && (
              <Link
                href="/sell"
                className="ml-auto px-4 py-2 rounded-full text-xs font-bold text-white transition-transform hover:scale-105"
                style={{ backgroundColor: '#FF2D78' }}
              >
                + Yeni elan
              </Link>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}>
              Aktiv elanlar
            </h2>
          </div>
        )}

        {/* Messages tab (owner only) */}
        {isOwner && activeTab === 'messages' && currentUserId && (
          <div style={{ height: 'calc(100vh - 340px)', minHeight: 400 }}>
            <MessagesUI currentUserId={currentUserId} />
          </div>
        )}

        {/* Listings content */}
        {(!isOwner || activeTab === 'listings') && (
        <div>

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
        )}
      </div>
    </main>
  )
}
