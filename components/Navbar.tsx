'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import type { NotifRow } from '@/lib/supabase'

export default function Navbar() {
  const router = useRouter()
  const [lang, setLang] = useState<'AZ' | 'RU'>('AZ')
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [basketCount, setBasketCount] = useState(0)
  const [notifCount, setNotifCount] = useState(0)
  const [notifs, setNotifs] = useState<NotifRow[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Fetch avatar once when user changes — no realtime needed in navbar
  useEffect(() => {
    if (!user) { setAvatarUrl(null); return }
    supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? null))
  }, [user])

  // Basket count: fetch on user change + listen for basket-changed custom event
  useEffect(() => {
    if (!user) { setBasketCount(0); return }

    function fetchBasketCount() {
      supabase
        .from('baskets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .then(({ count }) => setBasketCount(count ?? 0))
    }

    fetchBasketCount()
    window.addEventListener('basket-changed', fetchBasketCount)
    return () => window.removeEventListener('basket-changed', fetchBasketCount)
  }, [user])

  // Unread count: fetch once then poll every 30 s — avoids WS channel overhead
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
    const interval = setInterval(fetchCount, 30_000)
    return () => clearInterval(interval)
  }, [user])

  // Notifications: fetch + poll
  useEffect(() => {
    if (!user) { setNotifCount(0); setNotifs([]); return }

    function fetchNotifs() {
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(15)
        .then(({ data }) => {
          const rows = (data ?? []) as NotifRow[]
          setNotifs(rows)
          setNotifCount(rows.filter(n => !n.is_read).length)
        })
    }

    fetchNotifs()
    const interval = setInterval(fetchNotifs, 20_000)
    window.addEventListener('notif-changed', fetchNotifs)
    return () => { clearInterval(interval); window.removeEventListener('notif-changed', fetchNotifs) }
  }, [user])

  // Close notif dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function markAllNotifsRead() {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setNotifs(n => n.map(x => ({ ...x, is_read: true })))
    setNotifCount(0)
  }

  async function markNotifRead(id: string, link?: string | null) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: true } : x))
    setNotifCount(c => Math.max(0, c - 1))
    setNotifOpen(false)
    if (link) router.push(link)
  }

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
            {/* Notifications bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-white/10"
                aria-label="Bildirişlər"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs font-bold text-white px-1"
                    style={{ backgroundColor: '#FF2D78', border: '1.5px solid #1a1040' }}
                  >
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  className="absolute right-0 top-12 w-80 rounded-2xl overflow-hidden z-50"
                  style={{ border: '2px solid #1a1040', boxShadow: '3px 3px 0 #1a1040', backgroundColor: 'white', maxHeight: '400px', overflowY: 'auto' }}
                >
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
                    <span className="text-sm font-bold" style={{ color: '#1a1040' }}>Bildirişlər</span>
                    {notifCount > 0 && (
                      <button onClick={markAllNotifsRead} className="text-xs font-medium" style={{ color: '#FF2D78' }}>
                        Hamısını oxu
                      </button>
                    )}
                  </div>
                  {notifs.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">Bildiriş yoxdur</div>
                  ) : (
                    notifs.map(n => {
                      const typeStyle =
                        n.type === 'offer_accepted' ? { icon: '✓', color: '#10b981', bg: '#f0fdf4' } :
                        n.type === 'offer_rejected' ? { icon: '✗', color: '#ef4444', bg: '#fef2f2' } :
                        n.type === 'offer_countered' ? { icon: '↩', color: '#f97316', bg: '#fff7ed' } :
                        n.type === 'offer'          ? { icon: '💰', color: '#FF2D78', bg: '#FFF5F8' } :
                                                      { icon: '🔔', color: '#6b7280', bg: 'white'   }
                      return (
                        <button
                          key={n.id}
                          onClick={() => markNotifRead(n.id, n.link)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 flex gap-3 items-start"
                          style={{ backgroundColor: n.is_read ? 'white' : typeStyle.bg }}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: typeStyle.bg, color: typeStyle.color, border: `1.5px solid ${typeStyle.color}` }}
                          >
                            {typeStyle.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold" style={{ color: typeStyle.color }}>{n.title}</p>
                            {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                            <p className="text-xs text-gray-300 mt-1">{new Date(n.created_at).toLocaleDateString('az-AZ')}</p>
                          </div>
                          {!n.is_read && (
                            <div className="w-2 h-2 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: typeStyle.color }} />
                          )}
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>

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

            {/* Basket icon with count badge */}
            <Link
              href="/basket"
              className="relative flex items-center justify-center w-9 h-9 rounded-full transition-colors hover:bg-white/10"
              aria-label="Səbət"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {basketCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-xs font-bold text-white px-1"
                  style={{ backgroundColor: '#FF2D78', border: '1.5px solid #1a1040' }}
                >
                  {basketCount > 9 ? '9+' : basketCount}
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
