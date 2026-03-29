'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import CameraCapture, { type PhotoEntry } from '@/components/CameraCapture'
import { CATEGORIES, CATEGORY_EMOJIS, SUBCATEGORIES, SIZES_BY_SUBCATEGORY, DEFAULT_SIZES } from '@/lib/sizes'
import { sanitize } from '@/lib/sanitize'

const steps = ['Foto', 'Məlumat', 'Qiymət', 'Yayımla']

const conditions = [
  { value: 'new', label: 'Yeni', color: '#00E5CC', desc: 'Heç geyilməyib, etiket üstündə ola bilər' },
  { value: 'good', label: 'Yaxşı', color: '#FF9500', desc: 'Az istifadə edilib, əla vəziyyətdə' },
  { value: 'fair', label: 'Orta', color: '#FF2D78', desc: 'İstifadə izləri var amma sağlamdır' },
]

export default function SellPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  // Subcategory dropdown state
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
    title_ru: '',
    description_az: '',
    category: '',
    subcategory: '',
    size: '',
    brand: '',
    condition: '',
    price: '',
  })

  const update = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }))

  // Filtered subcategory list based on search input
  const allSubs = form.category ? (SUBCATEGORIES[form.category] ?? []) : []
  const filteredSubs = subSearch
    ? allSubs.filter((s) => s.toLowerCase().includes(subSearch.toLowerCase()))
    : allSubs

  // Sizes for selected subcategory
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

  const step1Valid = !!(form.gender && form.category && form.subcategory && form.condition)

  async function publishListing() {
    if (!userId) { setPublishError('İstifadəçi tapılmadı. Yenidən daxil olun.'); return }
    if (!form.title_az.trim()) { setPublishError('Başlıq tələb olunur (Azərbaycanca).'); return }
    if (!form.price || parseFloat(form.price) <= 0) { setPublishError('Düzgün qiymət daxil edin.'); return }
    if (!form.condition) { setPublishError('Vəziyyət seçilməlidir.'); return }

    setPublishing(true)
    setPublishError(null)

    // Rate limit: max 20 active listings per user
    const { count: activeCount } = await supabase
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('seller_id', userId)
      .eq('status', 'active')
    if ((activeCount ?? 0) >= 20) {
      setPublishError('Maksimum 20 aktiv elan yerləşdirə bilərsiniz')
      setPublishing(false)
      return
    }

    const uploadedUrls = photos
      .filter((p) => p.storageUrl !== null)
      .map((p) => p.storageUrl as string)

    const payload = {
      seller_id: userId,
      gender: form.gender || null,
      title_az: sanitize(form.title_az),
      title_ru: sanitize(form.title_ru) || sanitize(form.title_az),
      description_az: sanitize(form.description_az) || null,
      price: parseFloat(form.price),
      category: form.category || null,
      subcategory: form.subcategory || null,
      size: form.size || null,
      brand: sanitize(form.brand) || null,
      condition: form.condition as 'new' | 'good' | 'fair',
      images: uploadedUrls,
      status: 'active',
    }

    const { data, error } = await supabase.from('listings').insert(payload).select().single()

    setPublishing(false)
    if (error) {
      setPublishError(`Xəta: ${error.message} (${error.code})`)
      return
    }
    console.log('[publish] success:', data)
    router.push('/')
  }

  if (!authChecked) return null

  const inputClass = 'w-full px-4 py-3 rounded-xl text-sm outline-none'
  const inputStyle = { border: '2px solid #1a1040', backgroundColor: 'white' }

  return (
    <main className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      <h1
        className="text-2xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}
      >
        Elan ver
      </h1>
      <p className="text-sm text-gray-500 mb-8">Paltarını sat, pul qazan!</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-10">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer transition-all"
              style={
                i === step
                  ? { backgroundColor: '#FF2D78', color: 'white', border: '2px solid #1a1040' }
                  : i < step
                  ? { backgroundColor: '#00E5CC', color: '#1a1040', border: '2px solid #1a1040' }
                  : { backgroundColor: 'white', color: '#999', border: '2px solid #ccc' }
              }
              onClick={() => i < step && setStep(i)}
            >
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-medium ${i === step ? 'text-gray-900' : 'text-gray-400'}`}>
              {s}
            </span>
            {i < steps.length - 1 && <div className="w-6 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* ─── Step 0 — Photos ─────────────────────────────────────────── */}
      {step === 0 && (
        <CameraCapture userId={userId!} onChange={setPhotos} maxPhotos={5} />
      )}

      {/* ─── Step 1 — Details ───────────────────────────────────────── */}
      {step === 1 && (
        <div className="flex flex-col gap-5">
          <h2 className="text-lg font-bold" style={{ color: '#1a1040' }}>Məlumatlar</h2>

          <input
            className={inputClass}
            style={inputStyle}
            placeholder="Başlıq (Azərbaycanca) *"
            value={form.title_az}
            onChange={(e) => update('title_az', e.target.value)}
          />
          <input
            className={inputClass}
            style={inputStyle}
            placeholder="Başlıq (Rusca)"
            value={form.title_ru}
            onChange={(e) => update('title_ru', e.target.value)}
          />
          <textarea
            className={inputClass}
            style={{ ...inputStyle, resize: 'none' }}
            rows={3}
            placeholder="Təsvir (Azərbaycanca)"
            value={form.description_az}
            onChange={(e) => update('description_az', e.target.value)}
          />
          <input
            className={inputClass}
            style={inputStyle}
            placeholder="Brend (məs: Zara, Nike...)"
            value={form.brand}
            onChange={(e) => update('brand', e.target.value)}
          />

          {/* ── Gender selector ── */}
          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: '#1a1040' }}>
              Kimə aiddir <span style={{ color: '#FF2D78' }}>*</span>
            </p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: 'qadin', label: 'Qadın', emoji: '👩' },
                { value: 'kisi',  label: 'Kişi',  emoji: '👨' },
                { value: 'usaq',  label: 'Uşaq',  emoji: '🧒' },
                { value: 'el',    label: 'Əl işi', emoji: '🧶' },
              ].map((g) => (
                <button
                  key={g.value}
                  onClick={() => {
                    update('gender', g.value)
                    // Reset category when gender changes
                    setForm((f) => ({ ...f, gender: g.value, category: '', subcategory: '', size: '' }))
                    setSubSearch('')
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={
                    form.gender === g.value
                      ? { backgroundColor: '#1a1040', border: '2px solid #1a1040', boxShadow: '3px 3px 0 #FF2D78' }
                      : { backgroundColor: 'white', border: '2px solid #ccc' }
                  }
                >
                  <span className="text-2xl">{g.emoji}</span>
                  <span
                    className="text-xs font-semibold text-center leading-tight"
                    style={{ color: form.gender === g.value ? 'white' : '#1a1040' }}
                  >
                    {g.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Category cards ── */}
          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: '#1a1040' }}>
              Kateqoriya <span style={{ color: '#FF2D78' }}>*</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => selectCategory(cat)}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={
                    form.category === cat
                      ? { backgroundColor: '#FF2D78', border: '2px solid #1a1040', boxShadow: '3px 3px 0 #1a1040' }
                      : { backgroundColor: 'white', border: '2px solid #ccc' }
                  }
                >
                  <span className="text-2xl">{CATEGORY_EMOJIS[cat]}</span>
                  <span
                    className="text-xs font-semibold text-center leading-tight"
                    style={{ color: form.category === cat ? 'white' : '#1a1040' }}
                  >
                    {cat}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Subcategory searchable dropdown ── */}
          {form.category && (
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: '#1a1040' }}>
                Növ <span style={{ color: '#FF2D78' }}>*</span>
              </p>
              <div className="relative">
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl cursor-text"
                  style={{ border: `2px solid ${form.subcategory ? '#FF2D78' : '#1a1040'}`, backgroundColor: 'white' }}
                  onClick={() => { setSubOpen(true); subInputRef.current?.focus() }}
                >
                  {form.subcategory && !subOpen ? (
                    <>
                      <span className="flex-1 text-sm font-semibold" style={{ color: '#1a1040' }}>
                        {form.subcategory}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); selectSubcategory(''); setSubOpen(true); subInputRef.current?.focus() }}
                        className="text-gray-400 hover:text-gray-700 text-lg leading-none flex-shrink-0"
                      >
                        ×
                      </button>
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
                    style={{ border: '2px solid #1a1040', backgroundColor: 'white', maxHeight: '220px', boxShadow: '3px 3px 0 #1a1040' }}
                  >
                    {filteredSubs.map((sub) => (
                      <button
                        key={sub}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSubcategory(sub)}
                        className="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-pink-50"
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
                    style={{ border: '2px solid #e5e7eb', backgroundColor: 'white' }}
                  >
                    Nəticə tapılmadı
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Size chips ── */}
          {form.subcategory && (
            <div>
              <p className="text-sm font-semibold mb-2" style={{ color: '#1a1040' }}>Ölçü</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => update('size', form.size === s ? '' : s)}
                    className="min-w-[44px] px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    style={
                      form.size === s
                        ? { backgroundColor: '#FFE600', color: '#1a1040', border: '2px solid #1a1040' }
                        : { backgroundColor: 'white', color: '#1a1040', border: '2px solid #ccc' }
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Condition ── */}
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: '#1a1040' }}>
              Vəziyyət <span style={{ color: '#FF2D78' }}>*</span>
            </p>
            <div className="flex flex-col gap-2">
              {conditions.map((c) => (
                <button
                  key={c.value}
                  onClick={() => update('condition', c.value)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                  style={
                    form.condition === c.value
                      ? { border: `2px solid ${c.color}`, backgroundColor: `${c.color}20` }
                      : { border: '2px solid #ccc', backgroundColor: 'white' }
                  }
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <div>
                    <div className="text-sm font-semibold">{c.label}</div>
                    <div className="text-xs text-gray-500">{c.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Validation hint */}
          {!step1Valid && (
            <p className="text-xs text-gray-400">
              {!form.category ? '↑ Kateqoriya seçilməlidir' : !form.subcategory ? '↑ Növ seçilməlidir' : '↑ Vəziyyət seçilməlidir'}
            </p>
          )}
        </div>
      )}

      {/* ─── Step 2 — Price ─────────────────────────────────────────── */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-bold" style={{ color: '#1a1040' }}>Qiymət</h2>
          <div
            className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4"
            style={{ border: '2px solid #1a1040' }}
          >
            <span className="text-3xl font-bold" style={{ color: '#FF2D78' }}>₼</span>
            <input
              type="number"
              placeholder="0"
              value={form.price}
              onChange={(e) => update('price', e.target.value)}
              className="flex-1 text-3xl font-bold outline-none bg-transparent"
              style={{ color: '#1a1040' }}
            />
          </div>
          <div className="bg-yellow-50 rounded-xl p-4" style={{ border: '2px solid #FFE600' }}>
            <p className="text-sm font-semibold" style={{ color: '#1a1040' }}>💡 Qiymət məsləhəti</p>
            <p className="text-xs text-gray-600 mt-1">
              Oxşar məhsullar ortalama <strong>25–60 ₼</strong> arasında satılır. Ədalətli qiymət daha tez satışa kömək edir.
            </p>
          </div>
        </div>
      )}

      {/* ─── Step 3 — Publish ───────────────────────────────────────── */}
      {step === 3 && (
        <div className="text-center flex flex-col items-center gap-4 py-6">
          <div className="text-6xl">🎉</div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-unbounded)', color: '#1a1040' }}>
            Elanın hazırdır!
          </h2>
          <p className="text-sm text-gray-500 max-w-xs">
            Elanını yayımla, alıcıların sənə çatacaq!
          </p>

          {/* Summary */}
          {(form.category || form.subcategory) && (
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
              style={{ backgroundColor: '#FAF7F2', border: '2px solid #1a1040' }}
            >
              <span>{CATEGORY_EMOJIS[form.category]}</span>
              <span className="font-medium" style={{ color: '#1a1040' }}>
                {form.category}{form.subcategory ? ` › ${form.subcategory}` : ''}
              </span>
              {form.size && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ backgroundColor: '#FFE600', color: '#1a1040' }}
                >
                  {form.size}
                </span>
              )}
            </div>
          )}

          {publishError && (
            <div
              className="w-full px-4 py-3 rounded-xl text-sm"
              style={{ backgroundColor: '#FFF0F5', border: '2px solid #FF2D78', color: '#FF2D78' }}
            >
              {publishError}
            </div>
          )}
          {photos.length > 0 && (
            <div className="flex gap-2 justify-center">
              {photos.slice(0, 3).map((p, i) => (
                <div
                  key={p.id}
                  className="relative w-16 h-20 rounded-xl overflow-hidden"
                  style={{ border: '2px solid #1a1040' }}
                >
                  <Image src={p.previewUrl} alt={`Foto ${i + 1}`} fill className="object-cover" unoptimized />
                </div>
              ))}
              {photos.length > 3 && (
                <div
                  className="w-16 h-20 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ border: '2px solid #ccc', color: '#999' }}
                >
                  +{photos.length - 3}
                </div>
              )}
            </div>
          )}
          {photos.some((p) => p.uploading) && (
            <p className="text-xs text-gray-400">⏳ Fotolar yüklənir, gözləyin...</p>
          )}
          <button
            onClick={publishListing}
            disabled={publishing || photos.some((p) => p.uploading)}
            className="px-8 py-3 rounded-full font-bold text-white transition-transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040' }}
          >
            {publishing ? 'Yayımlanır...' : 'Yayımla'}
          </button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-10">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
          style={{ border: '2px solid #1a1040', color: '#1a1040', visibility: step === 0 ? 'hidden' : 'visible' }}
        >
          ← Geri
        </button>
        {step < steps.length - 1 && (
          <button
            onClick={() => {
              if (step === 1 && !step1Valid) return
              setStep((s) => Math.min(steps.length - 1, s + 1))
            }}
            disabled={step === 1 && !step1Valid}
            className="px-5 py-2.5 rounded-xl font-bold text-white text-sm transition-transform hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FF2D78' }}
          >
            İrəli →
          </button>
        )}
      </div>
    </main>
  )
}
