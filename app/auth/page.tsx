'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const inputClass = 'w-full px-4 py-3 rounded-xl text-sm outline-none transition-all'
  const inputStyle = { border: '2px solid #1a1040', backgroundColor: 'white' }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push('/')
        router.refresh()
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error

        // Insert profile row into public.users
        if (data.user) {
          await supabase.from('users').insert({
            id: data.user.id,
            email: data.user.email ?? null,
            full_name: name || null,
          })
        }

        setSuccess('Uğurla qeydiyyatdan keçdiniz! Zəhmət olmasa emailinizi təsdiqləyin. Təsdiq linki göndərildi.')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Xəta baş verdi'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: '#FAF7F2' }}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl p-8"
        style={{ border: '2px solid #1a1040', boxShadow: '4px 4px 0 #1a1040' }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold mb-1"
            style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
          >
            {mode === 'login' ? 'Xoş gəldin!' : 'Qeydiyyat'}
          </h1>
          <p className="text-sm text-gray-500">
            {mode === 'login' ? 'FASON hesabına daxil ol' : 'Yeni hesab yarat'}
          </p>
        </div>

        {/* Toggle */}
        <div
          className="flex rounded-xl p-1 mb-6"
          style={{ backgroundColor: '#FAF7F2', border: '2px solid #1a1040' }}
        >
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setSuccess(null) }}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                mode === m
                  ? { backgroundColor: '#FF2D78', color: 'white' }
                  : { color: '#666' }
              }
            >
              {m === 'login' ? 'Giriş' : 'Qeydiyyat'}
            </button>
          ))}
        </div>

        {/* Error / Success banners */}
        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#FFF0F5', border: '2px solid #FF2D78', color: '#FF2D78' }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: '#F0FFF9', border: '2px solid #00E5CC', color: '#00856F' }}
          >
            {success}
          </div>
        )}

        {/* Form */}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <input
              type="text"
              placeholder="Ad Soyad"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Şifrə (min 6 simvol)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={inputClass}
            style={inputStyle}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FF2D78' }}
          >
            {loading
              ? '...'
              : mode === 'login'
              ? 'Daxil ol'
              : 'Qeydiyyatdan keç'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Daxil olmaqla{' '}
          <Link href="#" className="underline" style={{ color: '#FF2D78' }}>
            İstifadə Şərtlərini
          </Link>{' '}
          qəbul etmiş olursunuz.
        </p>
      </div>
    </main>
  )
}
