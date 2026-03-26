'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { UserRow, ListingRow } from '@/lib/supabase'
import ListingCard from '@/components/ListingCard'
import type { MockListing } from '@/components/ListingCard'

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [profileUser, setProfileUser] = useState<UserRow | null>(null)
  const [listings, setListings] = useState<ListingRow[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      // Get logged-in user
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
      } else {
        // Fallback: if viewing own profile and row doesn't exist yet, upsert it
        if (authUser && authUser.id === id) {
          const fallback: UserRow = {
            id: authUser.id,
            email: authUser.email ?? null,
            phone: null,
            full_name: authUser.user_metadata?.full_name ?? null,
            avatar_url: null,
            is_seller: false,
            created_at: authUser.created_at,
          }
          // One-time insert for existing accounts that pre-date the trigger
          await supabase.from('users').upsert(fallback, { onConflict: 'id' })
          setProfileUser(fallback)
          setEditName(fallback.full_name ?? '')
        } else {
          // Viewing someone else's profile — best-effort fallback via auth metadata
          // (will only work for own account, so just leave profileUser null for others)
        }
      }

      // Fetch active listings
      const { data: listingData } = await supabase
        .from('listings')
        .select('*')
        .eq('seller_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      setListings(listingData ?? [])
      setLoading(false)
    }

    load()
  }, [id])

  async function saveProfile() {
    if (!currentUserId) return
    setSaving(true)
    await supabase
      .from('users')
      .update({ full_name: editName })
      .eq('id', currentUserId)
    setProfileUser((prev) => prev ? { ...prev, full_name: editName } : prev)
    setEditMode(false)
    setSaving(false)
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

  // Convert ListingRow to MockListing shape for ListingCard
  const listingCards: MockListing[] = listings.map((l) => ({
    id: l.id,
    title_az: l.title_az,
    title_ru: l.title_ru,
    price: l.price,
    brand: l.brand ?? '',
    condition: l.condition,
    images: l.images,
    seller: { name: displayName, avatar: profileUser.avatar_url ?? '' },
  }))

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
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
            <div className="flex items-center gap-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl text-sm text-white outline-none bg-transparent"
                style={{ border: '2px solid #FFE600' }}
              />
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50"
                style={{ backgroundColor: '#FFE600', color: '#1a1040' }}
              >
                {saving ? '...' : 'Saxla'}
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-white/60 border border-white/20"
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

        {/* Stats */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div
              className="text-2xl font-bold"
              style={{ color: '#FFE600', fontFamily: 'var(--font-unbounded)' }}
            >
              {listings.length}
            </div>
            <div className="text-white/50 text-xs">Aktiv elan</div>
          </div>

          {/* Edit button — only for owner */}
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

      {/* Active listings */}
      <div>
        <h2
          className="text-lg font-bold mb-5"
          style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
        >
          Aktiv elanlar
        </h2>

        {listingCards.length === 0 ? (
          <div
            className="text-center py-16 rounded-2xl"
            style={{ border: '2px dashed #ccc' }}
          >
            <p className="text-gray-400 text-sm">Hələ elan yoxdur.</p>
            {isOwner && (
              <Link
                href="/sell"
                className="mt-3 inline-block px-5 py-2.5 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: '#FF2D78' }}
              >
                + Elan ver
              </Link>
            )}
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
            {listingCards.map((listing) => (
              <div key={listing.id} className="break-inside-avoid">
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
