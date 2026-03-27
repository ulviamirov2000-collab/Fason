'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import CameraCapture, { type PhotoEntry } from '@/components/CameraCapture'
import { SELL_CATEGORIES, SIZES_BY_CATEGORY, DEFAULT_SIZES } from '@/lib/sizes'

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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.replace('/auth')
      else { setUserId(data.user.id); setAuthChecked(true) }
    })
  }, [router])

  // Photos managed by CameraCapture, synced here for publish step
  const [photos, setPhotos] = useState<PhotoEntry[]>([])

  const [form, setForm] = useState({
    title_az: '',
    title_ru: '',
    description_az: '',
    category: '',
    size: '',
    brand: '',
    condition: '',
    price: '',
  })

  const update = (field: string, val: string) => setForm((f) => ({ ...f, [field]: val }))

  async function publishListing() {
    // Validate required fields
    if (!userId) { setPublishError('İstifadəçi tapılmadı. Yenidən daxil olun.'); return }
    if (!form.title_az.trim()) { setPublishError('Başlıq tələb olunur (Azərbaycanca).'); return }
    if (!form.price || parseFloat(form.price) <= 0) { setPublishError('Düzgün qiymət daxil edin.'); return }
    if (!form.condition) { setPublishError('Vəziyyət seçilməlidir.'); return }

    setPublishing(true)
    setPublishError(null)

    // Collect already-uploaded URLs; skip any that failed or are still uploading
    const uploadedUrls = photos
      .filter((p) => p.storageUrl !== null)
      .map((p) => p.storageUrl as string)

    console.log('[publish] using uploaded URLs:', uploadedUrls)

    const payload = {
      seller_id: userId,
      title_az: form.title_az.trim(),
      title_ru: form.title_ru.trim() || form.title_az.trim(),
      description_az: form.description_az.trim() || null,
      price: parseFloat(form.price),
      category: form.category || null,
      size: form.size || null,
      brand: form.brand.trim() || null,
      condition: form.condition as 'new' | 'good' | 'fair',
      images: uploadedUrls,
      status: 'active',
    }

    console.log('[publish] payload:', payload)

    const { data, error } = await supabase.from('listings').insert(payload).select().single()

    console.log('[publish] response:', { data, error })

    setPublishing(false)
    if (error) {
      setPublishError(`Xəta: ${error.message} (${error.code})`)
      return
    }
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
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-bold" style={{ color: '#1a1040' }}>Məlumatlar</h2>
          <input
            className={inputClass}
            style={inputStyle}
            placeholder="Başlıq (Azərbaycanca)"
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

          {/* Category */}
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: '#1a1040' }}>Kateqoriya</p>
            <div className="flex flex-wrap gap-2">
              {SELL_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    update('category', c)
                    // Clear size when category changes — sizes are incompatible across categories
                    if (form.category !== c) update('size', '')
                  }}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={
                    form.category === c
                      ? { backgroundColor: '#FF2D78', color: 'white', border: '2px solid #1a1040' }
                      : { backgroundColor: 'white', color: '#1a1040', border: '2px solid #ccc' }
                  }
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Size — chips depend on selected category */}
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: '#1a1040' }}>
              Ölçü
              {!form.category && (
                <span className="ml-1 font-normal text-gray-400">(kateqoriya seçin)</span>
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {(form.category ? (SIZES_BY_CATEGORY[form.category] ?? DEFAULT_SIZES) : DEFAULT_SIZES).map((s) => (
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

          {/* Condition */}
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: '#1a1040' }}>Vəziyyət</p>
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
            onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
            className="px-5 py-2.5 rounded-xl font-bold text-white text-sm transition-transform hover:scale-105"
            style={{ backgroundColor: '#FF2D78' }}
          >
            İrəli →
          </button>
        )}
      </div>
    </main>
  )
}
