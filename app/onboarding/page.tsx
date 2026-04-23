'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

const CATEGORIES = [
  'Qadın geyimi', 'Kişi geyimi', 'Uşaq geyimi',
  'Əl işi', 'Aksesuar', 'Vintage', 'Brend geyim', 'Digər',
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [lang, setLang] = useState<'az' | 'ru'>('az')

  // Step 1
  const [role, setRole] = useState<'individual' | 'shop' | null>(null)

  // Step 2
  const [categories, setCategories] = useState<string[]>([])

  // Step 3
  const [shopName, setShopName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const slug = shopName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')

  function toggleCategory(cat: string) {
    setCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  async function uploadFile(file: File, bucket: string, path: string): Promise<string | null> {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) return null
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  async function finishOnboarding() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/auth'); return }

    let avatarUrl: string | null = null
    let bannerUrl: string | null = null

    if (avatarFile) avatarUrl = await uploadFile(avatarFile, 'avatars', `${user.id}/avatar`)
    if (bannerFile) bannerUrl = await uploadFile(bannerFile, 'banners', `${user.id}/banner`)

    await supabase.from('users').update({
      onboarding_completed: true,
      seller_type: role,
      seller_categories: categories,
      shop_name: shopName.trim() || null,
      bio: bio.trim() || null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      ...(bannerUrl ? { banner_url: bannerUrl } : {}),
    }).eq('id', user.id)

    if (typeof window !== 'undefined') {
      localStorage.setItem(`onboarding_${user.id}`, 'done')
    }

    setSaving(false)
    router.replace('/')
  }

  const t = {
    az: {
      step1Title: 'Sən kimsən?', step1Sub: 'Platformada rolunu seç',
      individual: 'Fərdi satıcı', individualSub: 'Öz paltarlarını sat',
      shop: 'Mağaza', shopSub: 'Bir neçə brendlə işlə',
      next: 'Davam et →',
      step2Title: 'Nə satırsan?', step2Sub: 'Kateqoriyaları seç (birdən çox ola bilər)',
      step3Title: 'Profilini qur', step3Sub: 'Alıcılara görünəcək',
      shopNameLabel: 'Mağaza / Ad', shopNamePlaceholder: 'Məs: Aytənin Dolabı',
      slugPreview: 'Linkin:', bioLabel: 'Haqqında', bioPlaceholder: 'Özün haqqında qısa məlumat...',
      avatarLabel: 'Profil şəkli', bannerLabel: 'Banner (16:9)',
      finish: 'Başla ✦', change: 'Dəyiş',
    },
    ru: {
      step1Title: 'Кто ты?', step1Sub: 'Выбери свою роль',
      individual: 'Частный продавец', individualSub: 'Продавай свои вещи',
      shop: 'Магазин', shopSub: 'Работай с несколькими брендами',
      next: 'Продолжить →',
      step2Title: 'Что продаёшь?', step2Sub: 'Выбери категории (можно несколько)',
      step3Title: 'Настрой профиль', step3Sub: 'Будет виден покупателям',
      shopNameLabel: 'Магазин / Имя', shopNamePlaceholder: 'Напр: Шкаф Айтен',
      slugPreview: 'Ссылка:', bioLabel: 'О себе', bioPlaceholder: 'Краткая информация о себе...',
      avatarLabel: 'Фото профиля', bannerLabel: 'Баннер (16:9)',
      finish: 'Начать ✦', change: 'Изм.',
    },
  }[lang]

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start pt-8 pb-16 px-4"
      style={{ backgroundColor: '#0D0B1F', fontFamily: 'var(--font-space-grotesk), sans-serif' }}
    >
      {/* Lang toggle */}
      <div className="w-full max-w-[480px] flex justify-end mb-4">
        <div className="flex rounded-full overflow-hidden" style={{ border: '1.5px solid #333' }}>
          {(['az', 'ru'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="px-3 py-1 text-xs font-bold uppercase transition-colors"
              style={{
                backgroundColor: lang === l ? '#FF2D78' : 'transparent',
                color: lang === l ? 'white' : '#888',
              }}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Progress — 3 steps */}
      <div className="w-full max-w-[480px] flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
              style={{
                backgroundColor: step >= s ? '#FF2D78' : '#1A1833',
                color: step >= s ? 'white' : '#555',
                border: step >= s ? '2px solid #FF2D78' : '2px solid #333',
              }}
            >
              {step > s ? '✓' : s}
            </div>
            {i < 2 && (
              <div
                className="h-0.5 flex-1 mx-1 transition-all"
                style={{ backgroundColor: step > s ? '#FF2D78' : '#222' }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div
        className="w-full max-w-[480px] rounded-3xl p-6 flex flex-col gap-5"
        style={{ backgroundColor: '#1A1833', border: '1.5px solid #2A2845' }}
      >
        {/* Step 1 */}
        {step === 1 && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-unbounded)' }}>
                {t.step1Title}
              </h1>
              <p className="text-sm mt-1" style={{ color: '#888' }}>{t.step1Sub}</p>
            </div>
            <div className="flex flex-col gap-3">
              {([
                { key: 'individual' as const, icon: '👤', label: t.individual, sub: t.individualSub },
                { key: 'shop' as const, icon: '🏪', label: t.shop, sub: t.shopSub },
              ]).map(({ key, icon, label, sub }) => (
                <button
                  key={key}
                  onClick={() => setRole(key)}
                  className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
                  style={{
                    backgroundColor: role === key ? 'rgba(255,45,120,0.12)' : '#0D0B1F',
                    border: role === key ? '2px solid #FF2D78' : '2px solid #2A2845',
                  }}
                >
                  <span className="text-3xl">{icon}</span>
                  <div>
                    <p className="font-bold text-white text-sm">{label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#888' }}>{sub}</p>
                  </div>
                  {role === key && (
                    <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: '#FF2D78' }}>✓</div>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => role && setStep(2)}
              disabled={!role}
              className="w-full py-3.5 rounded-2xl font-bold text-white transition-all disabled:opacity-40"
              style={{ backgroundColor: '#FF2D78', border: '2px solid #FF2D78' }}
            >
              {t.next}
            </button>
          </>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-unbounded)' }}>
                {t.step2Title}
              </h1>
              <p className="text-sm mt-1" style={{ color: '#888' }}>{t.step2Sub}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                  style={{
                    backgroundColor: categories.includes(cat) ? '#FF2D78' : '#0D0B1F',
                    color: categories.includes(cat) ? 'white' : '#aaa',
                    border: categories.includes(cat) ? '1.5px solid #FF2D78' : '1.5px solid #2A2845',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3.5 rounded-2xl font-bold transition-all"
                style={{ backgroundColor: '#0D0B1F', color: '#888', border: '2px solid #2A2845' }}
              >
                ←
              </button>
              <button
                onClick={() => categories.length > 0 && setStep(3)}
                disabled={categories.length === 0}
                className="flex-[3] py-3.5 rounded-2xl font-bold text-white transition-all disabled:opacity-40"
                style={{ backgroundColor: '#FF2D78', border: '2px solid #FF2D78' }}
              >
                {t.next}
              </button>
            </div>
          </>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <>
            <div>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-unbounded)' }}>
                {t.step3Title}
              </h1>
              <p className="text-sm mt-1" style={{ color: '#888' }}>{t.step3Sub}</p>
            </div>

            {/* Banner */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: '#aaa' }}>{t.bannerLabel}</p>
              <div
                className="w-full rounded-2xl overflow-hidden cursor-pointer flex items-center justify-center relative"
                style={{ height: '120px', backgroundColor: '#0D0B1F', border: '2px dashed #2A2845' }}
                onClick={() => bannerInputRef.current?.click()}
              >
                {bannerPreview ? (
                  <Image src={bannerPreview} alt="banner" fill className="object-cover" unoptimized />
                ) : (
                  <span className="text-4xl">🖼</span>
                )}
                {bannerPreview && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm font-bold">{t.change}</span>
                  </div>
                )}
              </div>
              <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div
                className="relative w-16 h-16 rounded-full overflow-hidden cursor-pointer flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: '#0D0B1F', border: '2px dashed #2A2845' }}
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="avatar" fill className="object-cover" unoptimized />
                ) : (
                  <span className="text-2xl">👤</span>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: '#aaa' }}>{t.avatarLabel}</p>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="text-xs mt-1 font-bold"
                  style={{ color: '#FF2D78' }}
                >
                  {t.change}
                </button>
              </div>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Shop name */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#aaa' }}>{t.shopNameLabel}</label>
              <input
                type="text"
                value={shopName}
                onChange={e => setShopName(e.target.value)}
                placeholder={t.shopNamePlaceholder}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none text-white"
                style={{ backgroundColor: '#0D0B1F', border: '1.5px solid #2A2845' }}
              />
              {slug && (
                <p className="text-xs mt-1.5" style={{ color: '#555' }}>
                  {t.slugPreview} <span style={{ color: '#FFD700' }}>fason.az/{slug}</span>
                </p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#aaa' }}>
                {t.bioLabel}
                <span className="ml-2 font-normal" style={{ color: '#555' }}>{bio.length}/150</span>
              </label>
              <textarea
                rows={3}
                value={bio}
                maxLength={150}
                onChange={e => setBio(e.target.value)}
                placeholder={t.bioPlaceholder}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none text-white"
                style={{ backgroundColor: '#0D0B1F', border: '1.5px solid #2A2845' }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3.5 rounded-2xl font-bold transition-all"
                style={{ backgroundColor: '#0D0B1F', color: '#888', border: '2px solid #2A2845' }}
              >
                ←
              </button>
              <button
                onClick={finishOnboarding}
                disabled={saving}
                className="flex-[3] py-3.5 rounded-2xl font-bold text-white transition-all disabled:opacity-40"
                style={{ backgroundColor: '#FF2D78', border: '2px solid #FF2D78' }}
              >
                {saving ? '...' : t.finish}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
