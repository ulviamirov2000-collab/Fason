'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import CameraCapture, { type PhotoEntry } from '@/components/CameraCapture'
import { CATEGORIES, SUBCATEGORIES, SIZES_BY_SUBCATEGORY, DEFAULT_SIZES, CATEGORY_EMOJIS } from '@/lib/sizes'
import { sanitize } from '@/lib/sanitize'

const steps = ['Məlumat', 'Qiymət', 'Yayımla']

const conditions = [
  { value: 'new',  label: 'Yeni',  color: '#00E5CC', bg: '#E8FFFB', desc: 'Heç geyilməyib, etiket üstündə ola bilər' },
  { value: 'good', label: 'Yaxşı', color: '#FF9500', bg: '#FFF8EC', desc: 'Az istifadə edilib, əla vəziyyətdə' },
  { value: 'fair', label: 'Orta',  color: '#FF2D78', bg: '#FFF0F5', desc: 'İstifadə izləri var amma sağlamdır' },
]

const COLORS: { name: string; hex: string; border?: boolean }[] = [
  { name: 'Ağ',        hex: '#FFFFFF', border: true },
  { name: 'Qara',      hex: '#000000' },
  { name: 'Boz',       hex: '#9E9E9E' },
  { name: 'Bej',       hex: '#C8A882' },
  { name: 'Qəhvəyi',   hex: '#795548' },
  { name: 'Qırmızı',   hex: '#F44336' },
  { name: 'Narıncı',   hex: '#FF9800' },
  { name: 'Sarı',      hex: '#FFEB3B' },
  { name: 'Yaşıl',     hex: '#4CAF50' },
  { name: 'Mavi',      hex: '#2196F3' },
  { name: 'Göy',       hex: '#00BCD4' },
  { name: 'Bənövşəyi', hex: '#9C27B0' },
  { name: 'Çəhrayı',   hex: '#E91E63' },
  { name: 'Qızılı',    hex: '#FFD700' },
  { name: 'Gümüşü',    hex: '#C0C0C0' },
  { name: 'Çoxrəngli', hex: 'rainbow' },
]

const QUICK_PRICES = [5, 10, 20, 30, 50, 80, 100, 150]

function SectionCard({
  number, title, badge, children,
}: {
  number: number; title: string; badge?: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}>
      <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1.5px solid #e5e7eb', backgroundColor: '#FAFAFA' }}>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ backgroundColor: '#FF2D78' }}
        >
          {number}
        </div>
        <span className="font-bold text-sm" style={{ color: '#1a1040' }}>{title}</span>
        {badge && <span className="text-xs text-gray-400 ml-auto">{badge}</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function SellPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [profileCheckModal, setProfileCheckModal] = useState(false)

  const [subSearch, setSubSearch] = useState('')
  const [subOpen, setSubOpen] = useState(false)
  const subInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/auth')
      else { setUserId(data.user.id); setAuthChecked(true) }
    })
  }, [router])

  const [photos, setPhotos] = useState<PhotoEntry[]>([])

  const [form, setForm] = useState({
    gender: '',
    title_az: '',
    description_az: '',
    category: '',
    subcategory: '',
    color: '',
    size: '',
    brand: '',
    condition: '',
    price: '',
  })

  const update = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }))

  const allSubs = form.category ? (SUBCATEGORIES[form.category] ?? []) : []
  const filteredSubs = subSearch
    ? allSubs.filter((s) => s.toLowerCase().includes(subSearch.toLowerCase()))
    : allSubs

  const sizes = form.subcategory
    ? (SIZES_BY_SUBCATEGORY[form.subcategory] ?? DEFAULT_SIZES)
    : DEFAULT_SIZES

  function selectCategory(cat: string) {
    setForm((f) => ({ ...f, category: cat, subcategory: '', size: '' }))
    setSubSearch('')
    setSubOpen(false)
  }

  function selectSubcategory(sub: string) {
    setForm((f) => ({ ...f, subcategory: sub, size: '' }))
    setSubSearch('')
    setSubOpen(false)
  }

  const step0Valid = !!(form.gender && form.category && form.subcategory && form.color && form.condition)

  async function publishListing() {
    if (!userId) { setPublishError('İstifadəçi tapılmadı. Yenidən daxil olun.'); return }
    if (!form.title_az.trim()) { setPublishError('Məhsulun adı tələb olunur.'); return }
    if (!form.price || parseFloat(form.price) <= 0) { setPublishError('Düzgün qiymət daxil edin.'); return }
    if (!form.condition) { setPublishError('Vəziyyət seçilməlidir.'); return }

    const { data: userProfile } = await supabase
      .from('users').select('phone, address').eq('id', userId).single()
    if (!userProfile?.phone || !(userProfile as { phone?: string | null; address?: string | null }).address) {
      setProfileCheckModal(true)
      return
    }

    setPublishing(true)
    setPublishError(null)

    const { count: activeCount } = await supabase
      .from('listings').select('id', { count: 'exact', head: true })
      .eq('seller_id', userId).eq('status', 'active')
    if ((activeCount ?? 0) >= 20) {
      setPublishError('Maksimum 20 aktiv elan yerləşdirə bilərsiniz')
      setPublishing(false)
      return
    }

    const uploadedUrls = photos.filter((p) => p.storageUrl !== null).map((p) => p.storageUrl as string)
    const title = sanitize(form.title_az)

    const payload = {
      seller_id: userId,
      gender: form.gender || null,
      title_az: title,
      title_ru: title,
      description_az: sanitize(form.description_az) || null,
      price: parseFloat(form.price),
      category: form.category || null,
      subcategory: form.subcategory || null,
      color: form.color || null,
      size: form.size || null,
      brand: sanitize(form.brand) || null,
      condition: form.condition as 'new' | 'good' | 'fair',
      images: uploadedUrls,
      status: 'active',
    }

    const { data, error } = await supabase.from('listings').insert(payload).select().single()
    setPublishing(false)
    if (error) { setPublishError(`Xəta: ${error.message} (${error.code})`); return }
    console.log('[publish] success:', data)
    router.push('/')
  }

  if (!authChecked) return null

  const chipSel = { backgroundColor: '#FF2D78', border: '2px solid #FF2D78', color: 'white' }
  const chipDef = { backgroundColor: 'white', border: '1.5px solid #d1d5db', color: '#374151' }

  return (
    <main className="min-h-screen py-8 px-4 max-w-xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}>
          Elan ver
        </h1>
        <p className="text-sm text-gray-400 mt-1">Paltarını sat, pul qazan!</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <button
              className="flex items-center gap-2 flex-shrink-0"
              onClick={() => i < step && setStep(i)}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={
                  i === step
                    ? { backgroundColor: '#FF2D78', color: 'white', boxShadow: '0 0 0 3px #FFE6EF' }
                    : i < step
                    ? { backgroundColor: '#00E5CC', color: '#1a1040' }
                    : { backgroundColor: '#F3F4F6', color: '#9CA3AF' }
                }
              >
                {i < step ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : i + 1}
              </div>
              <span className="text-xs font-semibold hidden sm:block" style={{ color: i === step ? '#1a1040' : '#9CA3AF' }}>
                {s}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className="flex-1 h-px mx-3" style={{ backgroundColor: i < step ? '#00E5CC' : '#E5E7EB' }} />
            )}
          </div>
        ))}
      </div>

      {/* ─── Step 0 — Məlumat ─────────────────────────────── */}
      {step === 0 && (
        <div className="flex flex-col gap-4">

          {/* Section 1: Photos */}
          <SectionCard number={1} title="Fotolar" badge="isteğe bağlı">
            <CameraCapture userId={userId!} onChange={setPhotos} maxPhotos={5} />
          </SectionCard>

          {/* Section 2: Product info */}
          <SectionCard number={2} title="Məhsul haqqında">
            <div className="flex flex-col gap-3">
              <div className="relative">
                <input
                  className="w-full px-4 pt-5 pb-2.5 rounded-xl text-sm outline-none transition-all peer"
                  style={{ border: '1.5px solid #d1d5db', backgroundColor: 'white' }}
                  placeholder=" "
                  value={form.title_az}
                  onChange={(e) => update('title_az', e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = '#FF2D78')}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  id="title-field"
                />
                <label
                  htmlFor="title-field"
                  className="absolute left-4 top-1.5 text-xs font-semibold pointer-events-none"
                  style={{ color: '#FF2D78' }}
                >
                  Məhsulun adı <span>*</span>
                </label>
              </div>

              <div className="relative">
                <textarea
                  className="w-full px-4 pt-5 pb-2.5 rounded-xl text-sm outline-none resize-none transition-all"
                  style={{ border: '1.5px solid #d1d5db', backgroundColor: 'white' }}
                  rows={3}
                  placeholder=" "
                  value={form.description_az}
                  onChange={(e) => update('description_az', e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = '#FF2D78')}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  id="desc-field"
                />
                <label
                  htmlFor="desc-field"
                  className="absolute left-4 top-1.5 text-xs font-semibold pointer-events-none"
                  style={{ color: '#9CA3AF' }}
                >
                  Qısa təsvir
                </label>
              </div>

              <div className="relative">
                <input
                  className="w-full px-4 pt-5 pb-2.5 rounded-xl text-sm outline-none transition-all"
                  style={{ border: '1.5px solid #d1d5db', backgroundColor: 'white' }}
                  placeholder=" "
                  value={form.brand}
                  onChange={(e) => update('brand', e.target.value)}
                  onFocus={(e) => (e.target.style.borderColor = '#FF2D78')}
                  onBlur={(e) => (e.target.style.borderColor = '#d1d5db')}
                  id="brand-field"
                />
                <label
                  htmlFor="brand-field"
                  className="absolute left-4 top-1.5 text-xs font-semibold pointer-events-none"
                  style={{ color: '#9CA3AF' }}
                >
                  Brend adı (məs: Zara, Nike...)
                </label>
              </div>
            </div>
          </SectionCard>

          {/* Section 3: Category */}
          <SectionCard number={3} title="Kateqoriya" badge="* tələb olunur">
            <div className="flex flex-col gap-5">

              {/* Gender */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: '#6B7280' }}>
                  Kimə aiddir
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'qadin', label: 'Qadın' },
                    { value: 'kisi',  label: 'Kişi'  },
                    { value: 'usaq',  label: 'Uşaq'  },
                    { value: 'el',    label: 'Əl işi' },
                  ].map((g) => (
                    <button key={g.value}
                      onClick={() => { setForm((f) => ({ ...f, gender: g.value, category: '', subcategory: '', size: '' })); setSubSearch('') }}
                      className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                      style={form.gender === g.value ? chipSel : chipDef}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: '#6B7280' }}>
                  Kateqoriya
                </p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button key={cat} onClick={() => selectCategory(cat)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all"
                      style={form.category === cat ? chipSel : chipDef}>
                      <span>{CATEGORY_EMOJIS[cat]}</span>
                      <span>{cat}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategory */}
              {form.category && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: '#6B7280' }}>
                    Növ
                  </p>
                  <div className="relative">
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-xl cursor-text transition-all"
                      style={{ border: `1.5px solid ${form.subcategory ? '#FF2D78' : '#d1d5db'}`, backgroundColor: 'white' }}
                      onClick={() => { setSubOpen(true); subInputRef.current?.focus() }}
                    >
                      {form.subcategory && !subOpen ? (
                        <>
                          <span className="flex-1 text-sm font-semibold" style={{ color: '#1a1040' }}>{form.subcategory}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); selectSubcategory(''); setSubOpen(true); subInputRef.current?.focus() }}
                            className="text-gray-400 hover:text-gray-600 text-lg leading-none flex-shrink-0"
                          >×</button>
                        </>
                      ) : (
                        <input
                          ref={subInputRef}
                          type="text"
                          value={subSearch}
                          onChange={(e) => { setSubSearch(e.target.value); setSubOpen(true) }}
                          onFocus={() => setSubOpen(true)}
                          onBlur={() => setTimeout(() => setSubOpen(false), 150)}
                          placeholder={form.subcategory || 'Növü axtar və ya seçin...'}
                          className="flex-1 text-sm outline-none bg-transparent"
                        />
                      )}
                    </div>
                    {subOpen && filteredSubs.length > 0 && (
                      <div
                        className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl overflow-hidden overflow-y-auto"
                        style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white', maxHeight: '220px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                      >
                        {filteredSubs.map((sub) => (
                          <button
                            key={sub}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectSubcategory(sub)}
                            className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-gray-50"
                            style={sub === form.subcategory ? { backgroundColor: '#FFF0F5', fontWeight: 600, color: '#FF2D78' } : { color: '#1a1040' }}
                          >
                            {sub}
                          </button>
                        ))}
                      </div>
                    )}
                    {subOpen && filteredSubs.length === 0 && (
                      <div
                        className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl px-4 py-3 text-sm text-gray-400"
                        style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}
                      >
                        Nəticə tapılmadı
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Section 4: Details */}
          {form.subcategory && (
            <SectionCard number={4} title="Detallar" badge="* tələb olunur">
              <div className="flex flex-col gap-5">

                {/* Color */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#6B7280' }}>
                    Rəng {form.color && <span style={{ color: '#FF2D78' }}>· {form.color}</span>}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {COLORS.map((c) => {
                      const selected = form.color === c.name
                      return (
                        <button
                          key={c.name}
                          onClick={() => update('color', selected ? '' : c.name)}
                          title={c.name}
                          className="w-9 h-9 rounded-full flex-shrink-0 transition-transform hover:scale-110 active:scale-95"
                          style={{
                            background: c.hex === 'rainbow' ? 'conic-gradient(red,orange,yellow,green,cyan,blue,violet,red)' : c.hex,
                            border: selected ? '3px solid #FF2D78' : c.border ? '2px solid #ccc' : '2px solid transparent',
                            boxShadow: selected ? '0 0 0 2px white, 0 0 0 4px #FF2D78' : undefined,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Size */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: '#6B7280' }}>
                    Ölçü <span className="normal-case font-normal">(isteğe bağlı)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => update('size', form.size === s ? '' : s)}
                        className="min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all"
                        style={form.size === s
                          ? { backgroundColor: '#FFE600', color: '#1a1040', border: '2px solid #1a1040' }
                          : { backgroundColor: 'white', color: '#374151', border: '1.5px solid #d1d5db' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Condition */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: '#6B7280' }}>
                    Vəziyyət
                  </p>
                  <div className="flex flex-col gap-2">
                    {conditions.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => update('condition', c.value)}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all"
                        style={form.condition === c.value
                          ? { border: `2px solid ${c.color}`, backgroundColor: c.bg }
                          : { border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}
                      >
                        <div className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                        <div>
                          <div className="text-sm font-semibold" style={{ color: '#1a1040' }}>{c.label}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{c.desc}</div>
                        </div>
                        {form.condition === c.value && (
                          <div className="ml-auto">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {/* Validation hint */}
          {!step0Valid && (
            <p className="text-xs text-center py-2" style={{ color: '#9CA3AF' }}>
              {!form.gender ? '↑ Kimə aid olduğu seçilməlidir'
                : !form.category ? '↑ Kateqoriya seçilməlidir'
                : !form.subcategory ? '↑ Növ seçilməlidir'
                : !form.color ? '↑ Rəng seçilməlidir'
                : '↑ Vəziyyət seçilməlidir'}
            </p>
          )}
        </div>
      )}

      {/* ─── Step 1 — Qiymət ──────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1.5px solid #e5e7eb', backgroundColor: 'white' }}
          >
            <div className="px-5 py-3.5" style={{ borderBottom: '1.5px solid #e5e7eb', backgroundColor: '#FAFAFA' }}>
              <p className="text-sm font-bold" style={{ color: '#1a1040' }}>Satış qiyməti</p>
              <p className="text-xs text-gray-400 mt-0.5">Ədalətli qiymət daha tez satışa kömək edir</p>
            </div>
            <div className="p-5">
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all"
                style={{ border: '1.5px solid #d1d5db', backgroundColor: 'white' }}
                onFocusCapture={(e) => (e.currentTarget.style.borderColor = '#FF2D78')}
                onBlurCapture={(e) => (e.currentTarget.style.borderColor = '#d1d5db')}
              >
                <span className="text-3xl font-black flex-shrink-0" style={{ color: '#FF2D78', fontFamily: 'var(--font-unbounded)' }}>₼</span>
                <input
                  type="number"
                  placeholder="0"
                  value={form.price}
                  onChange={(e) => update('price', e.target.value)}
                  className="flex-1 text-4xl font-black outline-none bg-transparent"
                  style={{ color: '#1a1040', fontFamily: 'var(--font-unbounded)' }}
                />
              </div>

              {/* Quick price chips */}
              <div className="mt-4">
                <p className="text-xs text-gray-400 mb-2.5">Sürətli seçim</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PRICES.map((p) => (
                    <button
                      key={p}
                      onClick={() => update('price', String(p))}
                      className="px-3.5 py-1.5 rounded-full text-sm font-bold transition-all"
                      style={form.price === String(p)
                        ? { backgroundColor: '#FF2D78', color: 'white', border: '2px solid #FF2D78' }
                        : { backgroundColor: 'white', color: '#374151', border: '1.5px solid #d1d5db' }}
                    >
                      {p} ₼
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tip */}
          <div className="flex gap-3 px-4 py-3.5 rounded-2xl" style={{ backgroundColor: '#FFFBEB', border: '1.5px solid #FDE68A' }}>
            <span className="text-xl flex-shrink-0">💡</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#92400E' }}>Qiymət məsləhəti</p>
              <p className="text-xs mt-0.5" style={{ color: '#B45309' }}>
                Oxşar məhsullar <strong>25–60 ₼</strong> arasında satılır. Ədalətli qiymət daha çox alıcı cəlb edir.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 2 — Yayımla ─────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          {/* Summary card */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid #e5e7eb' }}>
            <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1.5px solid #e5e7eb', backgroundColor: '#FAFAFA' }}>
              <p className="text-sm font-bold" style={{ color: '#1a1040' }}>Elanın icmalı</p>
              <button onClick={() => setStep(0)} className="text-xs font-semibold underline" style={{ color: '#FF2D78' }}>
                Düzəlt
              </button>
            </div>
            <div className="p-5 bg-white flex gap-4">
              {photos.length > 0 ? (
                <div className="flex gap-2 flex-shrink-0">
                  {photos.slice(0, 3).map((p, i) => (
                    <div key={p.id} className="relative rounded-xl overflow-hidden" style={{ width: 64, height: 80, border: '1.5px solid #e5e7eb' }}>
                      <Image src={p.previewUrl} alt={`Foto ${i + 1}`} fill className="object-cover" unoptimized />
                    </div>
                  ))}
                  {photos.length > 3 && (
                    <div className="w-16 h-20 rounded-xl flex items-center justify-center text-sm font-bold" style={{ border: '1.5px solid #e5e7eb', color: '#9CA3AF' }}>
                      +{photos.length - 3}
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-16 h-20 rounded-xl flex items-center justify-center flex-shrink-0" style={{ border: '1.5px dashed #e5e7eb', backgroundColor: '#F9FAFB' }}>
                  <span className="text-2xl">👗</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: '#1a1040' }}>
                  {form.title_az || <span className="text-gray-400 font-normal">Ad daxil edilməyib</span>}
                </p>
                <p className="text-2xl font-black mt-1" style={{ color: '#FF2D78', fontFamily: 'var(--font-unbounded)' }}>
                  {form.price ? `${form.price} ₼` : '—'}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {form.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>
                      {CATEGORY_EMOJIS[form.category]} {form.category}
                    </span>
                  )}
                  {form.subcategory && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#FFF0F5', color: '#FF2D78' }}>
                      {form.subcategory}
                    </span>
                  )}
                  {form.size && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#FFE600', color: '#1a1040' }}>
                      {form.size}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {photos.some((p) => p.uploading) && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ backgroundColor: '#F0FFF9', border: '1.5px solid #A7F3D0' }}>
              <div className="w-4 h-4 rounded-full border-2 border-emerald-200 border-t-emerald-500 animate-spin flex-shrink-0" />
              <p className="text-sm text-emerald-700">Fotolar yüklənir, gözləyin...</p>
            </div>
          )}

          {publishError && (
            <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#FFF0F5', border: '1.5px solid #FF2D78', color: '#CC0044' }}>
              ⚠ {publishError}
            </div>
          )}

          <button
            onClick={publishListing}
            disabled={publishing || photos.some((p) => p.uploading)}
            className="w-full py-4 rounded-2xl font-bold text-white text-base transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040', boxShadow: '3px 3px 0 #1a1040' }}
          >
            {publishing ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Yayımlanır...
              </span>
            ) : '✦ Elanı yayımla'}
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:bg-gray-50"
          style={{ border: '1.5px solid #d1d5db', color: '#374151', visibility: step === 0 ? 'hidden' : 'visible' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Geri
        </button>
        {step < steps.length - 1 && (
          <button
            onClick={() => {
              if (step === 0 && !step0Valid) return
              setStep((s) => Math.min(steps.length - 1, s + 1))
            }}
            disabled={step === 0 && !step0Valid}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FF2D78', boxShadow: '2px 2px 0 #1a1040' }}
          >
            İrəli
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        )}
      </div>

      {/* Profile completeness modal */}
      {profileCheckModal && userId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-4 text-center bg-white" style={{ border: '2px solid #1a1040', boxShadow: '4px 4px 0 #1a1040' }}>
            <div className="text-4xl">📋</div>
            <h3 className="font-bold text-base" style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}>
              Profil tamamlanmayıb
            </h3>
            <p className="text-sm text-gray-500">
              Elan yerləşdirmək üçün telefon nömrəsi və ünvan əlavə etməlisiniz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setProfileCheckModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ border: '1.5px solid #d1d5db', color: '#6B7280' }}
              >
                Ləğv et
              </button>
              <button
                onClick={() => router.push(`/profile/${userId}?tab=settings`)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040' }}
              >
                Profili tamamla
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
