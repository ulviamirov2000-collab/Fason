'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const router = useRouter()
  const [lang, setLang] = useState<'AZ' | 'RU'>('AZ')
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch avatar + subscribe to profile updates
  useEffect(() => {
    if (!user) { setAvatarUrl(null); return }

    supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? null))

    const channel = supabase
      .channel(`navbar-avatar:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${user.id}`,
      }, (payload) => { setAvatarUrl(payload.new.avatar_url ?? null) })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // Unread message count
  useEffect(() => {
    if (!user) { setUnreadCount(0); return }

    function fetchCount() {
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user!.id)
        .eq('is_read', false)
        .then(({ count }) => setUnreadCount(count ?? 0))
    }

    fetchCount()

    const channel = supabase
      .channel(`navbar-unread:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => { setUnreadCount((n) => n + 1) })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `receiver_id=eq.${user.id}`,
      }, () => { fetchCount() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setDropdownOpen(false)
    router.push('/')
    router.refresh()
  }

  // Initials avatar from email or name
  const initials = user?.email?.[0]?.toUpperCase() ?? '?'

  return (
    <nav
      style={{ backgroundColor: '#1a1040' }}
      className="sticky top-0 z-50 w-full border-b-2 border-pink-500"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/fasonicon.png"
            alt="FASON"
            width={40}
            height={40}
            className="rounded-lg"
          />
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-xl mx-auto">
          <input
            type="text"
            placeholder={lang === 'AZ' ? 'Axtar...' : 'Поиск...'}
            className="w-full rounded-full px-4 py-2 text-sm bg-white/10 text-white placeholder-white/50 outline-none focus:ring-2"
            style={{ border: '2px solid #FF2D78' }}
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Language toggle */}
          <div
            className="flex rounded-full overflow-hidden border-2"
            style={{ borderColor: '#FFE600' }}
          >
            <button
              onClick={() => setLang('AZ')}
              className={`px-3 py-1 text-xs font-bold transition-colors ${
                lang === 'AZ' ? 'text-black' : 'text-white/60 hover:text-white'
              }`}
              style={lang === 'AZ' ? { backgroundColor: '#FFE600' } : {}}
            >
              AZ
            </button>
            <button
              onClick={() => setLang('RU')}
              className={`px-3 py-1 text-xs font-bold transition-colors ${
                lang === 'RU' ? 'text-black' : 'text-white/60 hover:text-white'
              }`}
              style={lang === 'RU' ? { backgroundColor: '#FFE600' } : {}}
            >
              RU
            </button>
          </div>

          {/* Auth area */}
          {user ? (
            <>
            {/* Messages icon with unread badge */}
            <Link
              href="/messages"
              className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-white/10"
              aria-label="Mesajlar"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs font-bold text-white px-1"
                  style={{ backgroundColor: '#FF2D78', border: '1.5px solid #1a1040' }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* Avatar + dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 transition-opacity hover:opacity-80"
                aria-label="Profil menyusu"
              >
                <div
                  className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-pink-400 to-yellow-400 flex items-center justify-center text-sm font-bold"
                  style={{ border: '2px solid #FF2D78' }}
                >
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="Avatar" width={36} height={36} className="object-cover w-full h-full" unoptimized />
                  ) : (
                    <span className="text-black" style={{ color: '#1a1040' }}>{initials}</span>
                  )}
                </div>
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 top-12 w-48 rounded-2xl overflow-hidden z-50"
                  style={{ border: '2px solid #1a1040', boxShadow: '3px 3px 0 #1a1040', backgroundColor: 'white' }}
                >
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <Link
                    href={`/profile/${user.id}`}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    👤 {lang === 'AZ' ? 'Profilim' : 'Профиль'}
                  </Link>
                  <Link
                    href="/messages"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    💬 {lang === 'AZ' ? 'Mesajlar' : 'Сообщения'}
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium border-t border-gray-100 hover:bg-red-50 transition-colors"
                    style={{ color: '#FF2D78' }}
                  >
                    🚪 {lang === 'AZ' ? 'Çıxış' : 'Выйти'}
                  </button>
                </div>
              )}
            </div>
            </>
          ) : (
            /* Not logged in: Giriş button */
            <Link
              href="/auth"
              className="hidden sm:block text-white/80 hover:text-white text-sm font-medium px-3 py-1.5 rounded-full border border-white/20 hover:border-white/60 transition-all"
            >
              {lang === 'AZ' ? 'Giriş' : 'Войти'}
            </Link>
          )}

          {/* Sell CTA */}
          <Link
            href="/sell"
            className="text-white text-sm font-bold px-4 py-2 rounded-full transition-transform hover:scale-105 active:scale-95"
            style={{ backgroundColor: '#FF2D78' }}
          >
            {lang === 'AZ' ? 'Sat' : 'Продать'}
          </Link>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden text-white ml-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div className="sm:hidden px-4 pb-4 flex flex-col gap-2" style={{ backgroundColor: '#1a1040' }}>
          {user ? (
            <>
              <Link
                href={`/profile/${user.id}`}
                className="text-white/80 text-sm font-medium px-3 py-2 rounded-lg border border-white/20 text-center"
                onClick={() => setMenuOpen(false)}
              >
                👤 Profilim
              </Link>
              <button
                onClick={() => { handleSignOut(); setMenuOpen(false) }}
                className="text-sm font-medium px-3 py-2 rounded-lg border text-center"
                style={{ borderColor: '#FF2D78', color: '#FF2D78' }}
              >
                Çıxış
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="text-white/80 text-sm font-medium px-3 py-2 rounded-lg border border-white/20 text-center"
              onClick={() => setMenuOpen(false)}
            >
              {lang === 'AZ' ? 'Giriş' : 'Войти'}
            </Link>
          )}
        </div>
      )}
    </nav>
  )
}
