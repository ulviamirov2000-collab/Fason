'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

const steps = ['Foto', 'Məlumat', 'Qiymət', 'Yayımla']

const categories = ['Geyim', 'Ayaqqabı', 'Aksesuar', 'Çanta']
const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const conditions = [
  { value: 'new', label: 'Yeni', color: '#00E5CC', desc: 'Heç geyilməyib, etiket üstündə ola bilər' },
  { value: 'good', label: 'Yaxşı', color: '#FF9500', desc: 'Az istifadə edilib, əla vəziyyətdə' },
  { value: 'fair', label: 'Orta', color: '#FF2D78', desc: 'İstifadə izləri var amma sağlamdır' },
]

type Guide = {
  id: string
  icon: string
  label: string
  shape: React.ReactNode
}

const guides: Guide[] = [
  {
    id: 'pants',
    icon: '👖',
    label: 'Şalvar',
    shape: (
      <svg viewBox="0 0 120 180" fill="none" stroke="white" strokeWidth="3" className="w-full h-full">
        <path d="M25,10 L95,10 L105,90 L85,170 L65,170 L60,110 L55,170 L35,170 L15,90 Z"
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'shirt',
    icon: '👔',
    label: 'Köynək',
    shape: (
      <svg viewBox="0 0 140 140" fill="none" stroke="white" strokeWidth="3" className="w-full h-full">
        <path d="M50,10 L10,40 L28,55 L28,130 L112,130 L112,55 L130,40 L90,10 L80,30 Q70,38 60,30 Z"
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'dress',
    icon: '👗',
    label: 'Paltar',
    shape: (
      <svg viewBox="0 0 120 180" fill="none" stroke="white" strokeWidth="3" className="w-full h-full">
        <path d="M45,10 L75,10 L85,55 L110,170 L10,170 L35,55 Z"
          strokeLinejoin="round" strokeLinecap="round" />
        <line x1="45" y1="10" x2="35" y2="30" strokeLinecap="round" />
        <line x1="75" y1="10" x2="85" y2="30" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'bag',
    icon: '👜',
    label: 'Çanta',
    shape: (
      <svg viewBox="0 0 140 140" fill="none" stroke="white" strokeWidth="3" className="w-full h-full">
        <path d="M40,55 Q40,30 70,30 Q100,30 100,55 L115,55 Q125,55 125,65 L125,120 Q125,130 115,130 L25,130 Q15,130 15,120 L15,65 Q15,55 25,55 Z"
          strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'shoe',
    icon: '👟',
    label: 'Ayaqqabı',
    shape: (
      <svg viewBox="0 0 200 120" fill="none" stroke="white" strokeWidth="3" className="w-full h-full">
        <path d="M15,85 Q10,55 60,45 L130,35 Q170,30 185,55 Q200,75 180,95 Q160,108 100,108 L40,108 Q15,108 15,85 Z"
          strokeLinejoin="round" strokeLinecap="round" />
        <path d="M60,45 L65,85" strokeLinecap="round" strokeDasharray="4 4" />
      </svg>
    ),
  },
]

type PhotoEntry = { id: string; url: string; file: File }

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

  // Photo step state
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

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

    // Upload photos to Supabase Storage
    const uploadedUrls: string[] = []
    for (const photo of photos) {
      const ext = photo.file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(path, photo.file, { contentType: photo.file.type, upsert: false })
      if (uploadError) {
        console.warn('[upload] storage error:', uploadError.message)
        continue
      }
      const { data: { publicUrl } } = supabase.storage
        .from('listing-images')
        .getPublicUrl(path)
      uploadedUrls.push(publicUrl)
      console.log('[upload] uploaded:', publicUrl)
    }

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

  function handleFiles(files: FileList | null) {
    if (!files) return
    const remaining = 5 - photos.length
    const toAdd = Array.from(files).slice(0, remaining)
    const newPhotos: PhotoEntry[] = toAdd.map((file) => ({
      id: Math.random().toString(36).slice(2),
      url: URL.createObjectURL(file),
      file,
    }))
    setPhotos((prev) => [...prev, ...newPhotos])
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  const activeGuide = guides.find((g) => g.id === selectedGuide)

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
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-bold" style={{ color: '#1a1040' }}>Foto əlavə et</h2>

          {/* Guide selector */}
          <div>
            <p className="text-sm font-semibold mb-3" style={{ color: '#1a1040' }}>
              Məhsul növünü seç <span className="text-gray-400 font-normal">(isteğe bağlı)</span>
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {guides.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedGuide(selectedGuide === g.id ? null : g.id)}
                  className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all"
                  style={
                    selectedGuide === g.id
                      ? { backgroundColor: '#1a1040', border: '2px solid #FF2D78', minWidth: 64 }
                      : { backgroundColor: 'white', border: '2px solid #e5e7eb', minWidth: 64 }
                  }
                >
                  <span className="text-2xl">{g.icon}</span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: selectedGuide === g.id ? 'white' : '#1a1040' }}
                  >
                    {g.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Guide preview + upload area */}
          <div
            className="relative w-full rounded-3xl overflow-hidden flex flex-col items-center justify-center"
            style={{
              backgroundColor: '#1a1040',
              border: '2px solid #1a1040',
              minHeight: 260,
            }}
          >
            {/* Shape overlay */}
            {activeGuide && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                <div className="opacity-30 w-32 h-44">
                  {activeGuide.shape}
                </div>
              </div>
            )}

            {/* Upload prompt */}
            <div className="relative z-10 flex flex-col items-center gap-4 py-8 px-4">
              <p className="text-white/60 text-xs tracking-wide uppercase">
                {activeGuide ? `${activeGuide.icon} ${activeGuide.label} çəkmək üçün` : 'Foto əlavə et'}
              </p>

              {/* Hidden inputs */}
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              {/* Big touch-friendly buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => cameraRef.current?.click()}
                  disabled={photos.length >= 5}
                  className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl font-semibold text-black transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                  style={{ backgroundColor: '#FFE600', border: '2px solid #FFE600', minWidth: 100, minHeight: 80 }}
                >
                  <span className="text-2xl">📷</span>
                  <span className="text-xs font-bold">Kamera</span>
                </button>
                <button
                  onClick={() => galleryRef.current?.click()}
                  disabled={photos.length >= 5}
                  className="flex flex-col items-center gap-2 px-5 py-4 rounded-2xl font-semibold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                  style={{ backgroundColor: '#FF2D78', border: '2px solid #FF2D78', minWidth: 100, minHeight: 80 }}
                >
                  <span className="text-2xl">🖼</span>
                  <span className="text-xs font-bold">Qalereyadan seç</span>
                </button>
              </div>

              <p className="text-white/40 text-xs">
                {photos.length}/5 foto • Maks 5MB
              </p>
            </div>
          </div>

          {/* Photo previews */}
          {photos.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-3" style={{ color: '#1a1040' }}>
                Yüklənmiş fotolar
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="relative flex-shrink-0 rounded-2xl overflow-hidden"
                    style={{
                      width: 110,
                      height: 140,
                      border: index === 0 ? '2.5px solid #FF2D78' : '2px solid #1a1040',
                    }}
                  >
                    <Image
                      src={photo.url}
                      alt={`Foto ${index + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {/* Main photo badge */}
                    {index === 0 && (
                      <div
                        className="absolute bottom-0 left-0 right-0 text-center py-1 text-xs font-bold"
                        style={{ backgroundColor: '#FF2D78', color: 'white' }}
                      >
                        Əsas foto
                      </div>
                    )}
                    {/* Remove button */}
                    <button
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform hover:scale-110"
                      style={{ backgroundColor: 'rgba(26,16,64,0.85)' }}
                      aria-label="Sil"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Add more slot */}
                {photos.length < 5 && (
                  <button
                    onClick={() => galleryRef.current?.click()}
                    className="flex-shrink-0 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all hover:bg-gray-100"
                    style={{
                      width: 110,
                      height: 140,
                      border: '2px dashed #ccc',
                      backgroundColor: '#F9F9F9',
                    }}
                  >
                    <span className="text-xl text-gray-400">+</span>
                    <span className="text-xs text-gray-400">Əlavə et</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
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
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => update('category', c)}
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

          {/* Size */}
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: '#1a1040' }}>Ölçü</p>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => update('size', s)}
                  className="w-12 h-10 rounded-xl text-xs font-bold transition-all"
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
                  <Image src={p.url} alt={`Foto ${i + 1}`} fill className="object-cover" unoptimized />
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
          <button
            onClick={publishListing}
            disabled={publishing}
            className="px-8 py-3 rounded-full font-bold text-white transition-transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040' }}
          >
            {publishing ? 'Yüklənir...' : 'Yayımla'}
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
