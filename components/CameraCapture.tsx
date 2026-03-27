'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export type PhotoEntry = {
  id: string
  previewUrl: string       // blob URL — shown immediately
  storageUrl: string | null  // Supabase public URL — set after upload
  uploading: boolean
  uploadError: string | null
}

type GuideId = 'pants' | 'shirt' | 'dress' | 'bag' | 'shoe' | 'none'

type Guide = {
  id: GuideId
  icon: string
  label: string
  overlayW: string   // width  as % of video container
  overlayH: string   // height as % of video container
  viewBox: string
  paths: React.ReactNode
}

const guides: Guide[] = [
  {
    id: 'pants', icon: '👖', label: 'Şalvar',
    overlayW: '36%', overlayH: '74%',
    viewBox: '0 0 100 160',
    paths: <path d="M20,8 L80,8 L88,78 L72,152 L54,152 L50,100 L46,152 L28,152 L12,78 Z" strokeLinejoin="round" strokeLinecap="round" />,
  },
  {
    id: 'shirt', icon: '👔', label: 'Köynək',
    overlayW: '64%', overlayH: '58%',
    viewBox: '0 0 160 130',
    paths: <path d="M60,10 L10,42 L28,58 L28,120 L132,120 L132,58 L150,42 L100,10 L88,28 Q80,34 72,28 Z" strokeLinejoin="round" strokeLinecap="round" />,
  },
  {
    id: 'dress', icon: '👗', label: 'Paltar',
    overlayW: '40%', overlayH: '76%',
    viewBox: '0 0 110 170',
    paths: <>
      <path d="M40,10 L70,10 L80,50 L105,160 L5,160 L30,50 Z" strokeLinejoin="round" strokeLinecap="round" />
      <line x1="40" y1="10" x2="30" y2="28" strokeLinecap="round" />
      <line x1="70" y1="10" x2="80" y2="28" strokeLinecap="round" />
    </>,
  },
  {
    id: 'bag', icon: '👜', label: 'Çanta',
    overlayW: '54%', overlayH: '54%',
    viewBox: '0 0 130 130',
    paths: <path d="M36,50 Q36,28 65,28 Q94,28 94,50 L108,50 Q118,50 118,60 L118,112 Q118,122 108,122 L22,122 Q12,122 12,112 L12,60 Q12,50 22,50 Z" strokeLinejoin="round" strokeLinecap="round" />,
  },
  {
    id: 'shoe', icon: '👟', label: 'Ayaqqabı',
    overlayW: '72%', overlayH: '40%',
    viewBox: '0 0 200 100',
    paths: <>
      <path d="M12,72 Q10,48 52,38 L118,28 Q158,22 174,46 Q190,66 172,82 Q154,94 96,94 L36,94 Q12,94 12,72 Z" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M52,38 L56,72" strokeLinecap="round" strokeDasharray="3 3" />
    </>,
  },
  {
    id: 'none', icon: '✖', label: 'Yoxdur',
    overlayW: '0', overlayH: '0',
    viewBox: '0 0 1 1',
    paths: null,
  },
]

interface Props {
  userId: string
  onChange: (photos: PhotoEntry[]) => void
  maxPhotos?: number
}

export default function CameraCapture({ userId, onChange, maxPhotos = 5 }: Props) {
  const [selectedGuide, setSelectedGuide] = useState<GuideId>('none')
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<PhotoEntry[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const facingRef = useRef<'environment' | 'user'>('environment')

  // Keep parent in sync whenever photos change
  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { onChangeRef.current(photos) }, [photos])

  // Start stream whenever camera modal opens
  useEffect(() => {
    if (cameraOpen) startStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen])

  // Cleanup on unmount
  useEffect(() => () => stopStream(), [])

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function startStream() {
    try {
      stopStream()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facingRef.current }, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraError(null)
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : 'Kamera açılmadı. İcazə verin.')
      setCameraOpen(false)
    }
  }

  function closeCamera() {
    stopStream()
    setCameraOpen(false)
  }

  async function flipCamera() {
    facingRef.current = facingRef.current === 'environment' ? 'user' : 'environment'
    await startStream()
  }

  async function capturePhoto() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 960
    canvas.getContext('2d')?.drawImage(video, 0, 0)

    canvas.toBlob(async (blob) => {
      if (!blob) return
      const entryId = Math.random().toString(36).slice(2)
      const entry: PhotoEntry = {
        id: entryId,
        previewUrl: URL.createObjectURL(blob),
        storageUrl: null,
        uploading: true,
        uploadError: null,
      }
      setPhotos((prev) => [...prev, entry])
      closeCamera()
      await uploadBlob(blob, entryId)
    }, 'image/jpeg', 0.92)
  }

  async function uploadBlob(blob: Blob, entryId: string) {
    const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
    const { data, error } = await supabase.storage
      .from('listing-images')
      .upload(path, blob, { contentType: 'image/jpeg', upsert: false })

    if (error || !data) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === entryId ? { ...p, uploading: false, uploadError: error?.message ?? 'Xəta' } : p
        )
      )
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(data.path)
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === entryId ? { ...p, uploading: false, storageUrl: publicUrl, previewUrl: publicUrl } : p
      )
    )
  }

  async function handleGalleryFiles(files: FileList | null) {
    if (!files) return
    const remaining = maxPhotos - photos.length
    const toAdd = Array.from(files).slice(0, remaining)

    const entries: PhotoEntry[] = toAdd.map((file) => ({
      id: Math.random().toString(36).slice(2),
      previewUrl: URL.createObjectURL(file),
      storageUrl: null,
      uploading: true,
      uploadError: null,
    }))
    setPhotos((prev) => [...prev, ...entries])

    // Upload all in parallel
    await Promise.all(entries.map((entry, i) => uploadBlob(toAdd[i], entry.id)))
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  const guide = guides.find((g) => g.id === selectedGuide) ?? guides[guides.length - 1]
  const canAdd = photos.length < maxPhotos

  return (
    <div className="flex flex-col gap-5">

      {/* ── Guide selector ─────────────────────────────────────── */}
      <div>
        <p className="text-sm font-semibold mb-3" style={{ color: '#1a1040' }}>
          Məhsul növü <span className="font-normal text-gray-400">(isteğe bağlı)</span>
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {guides.map((g) => {
            const active = selectedGuide === g.id
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGuide(g.id)}
                className="flex-shrink-0 flex flex-col items-center gap-1.5 rounded-2xl p-2 transition-all"
                style={
                  active
                    ? { backgroundColor: '#1a1040', border: '2px solid #FF2D78', minWidth: 62 }
                    : { backgroundColor: 'white', border: '2px solid #e5e7eb', minWidth: 62 }
                }
              >
                {/* Mini shape preview card */}
                <div
                  className="w-full rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: active ? '#2d1f5e' : '#0f0830', height: 48, padding: 6 }}
                >
                  {g.id !== 'none' ? (
                    <svg
                      viewBox={g.viewBox}
                      fill="none"
                      stroke="white"
                      strokeWidth="4"
                      style={{ width: 28, height: 28, opacity: 0.8 }}
                    >
                      {g.paths}
                    </svg>
                  ) : (
                    <span className="text-white/40 text-xs">—</span>
                  )}
                </div>
                <span className="text-sm leading-none">{g.icon}</span>
                <span
                  className="text-xs font-semibold leading-none"
                  style={{ color: active ? 'white' : '#1a1040' }}
                >
                  {g.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Action buttons ─────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={() => canAdd && setCameraOpen(true)}
          disabled={!canAdd}
          className="flex-1 flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-bold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: '#FFE600', border: '2px solid #1a1040', minHeight: 90, color: '#1a1040' }}
        >
          <span className="text-3xl">📷</span>
          <span className="text-xs">Kamera ilə çək</span>
        </button>
        <button
          onClick={() => canAdd && galleryRef.current?.click()}
          disabled={!canAdd}
          className="flex-1 flex flex-col items-center justify-center gap-2 py-5 rounded-2xl font-bold text-white transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: '#FF2D78', border: '2px solid #1a1040', minHeight: 90 }}
        >
          <span className="text-3xl">🖼</span>
          <span className="text-xs">Qalereyadan seç</span>
        </button>
      </div>

      <p className="text-xs text-center text-gray-400">{photos.length}/{maxPhotos} foto • Maks 5 MB</p>

      {/* Hidden inputs */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleGalleryFiles(e.target.files)}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera permission error */}
      {cameraError && (
        <div
          className="text-sm px-4 py-3 rounded-xl"
          style={{ backgroundColor: '#FFF0F5', color: '#FF2D78', border: '2px solid #FF2D78' }}
        >
          ⚠ {cameraError}
        </div>
      )}

      {/* ── Photo previews ─────────────────────────────────────── */}
      {photos.length > 0 && (
        <div>
          <p className="text-sm font-semibold mb-3" style={{ color: '#1a1040' }}>
            Yüklənmiş fotolar
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {photos.map((photo, i) => (
              <div
                key={photo.id}
                className="relative flex-shrink-0 rounded-2xl overflow-hidden"
                style={{
                  width: 110, height: 140,
                  border: i === 0 ? '2.5px solid #FF2D78' : '2px solid #1a1040',
                }}
              >
                <Image
                  src={photo.previewUrl}
                  alt={`Foto ${i + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {photo.uploading && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(26,16,64,0.55)' }}
                  >
                    <div className="w-7 h-7 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  </div>
                )}
                {photo.uploadError && (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,45,120,0.65)' }}
                  >
                    <span className="text-white text-xs font-bold px-1 text-center">⚠ Xəta</span>
                  </div>
                )}
                {i === 0 && !photo.uploading && (
                  <div
                    className="absolute bottom-0 left-0 right-0 py-1 text-center text-xs font-bold"
                    style={{ backgroundColor: '#FF2D78', color: 'white' }}
                  >
                    Əsas foto
                  </div>
                )}
                <button
                  onClick={() => removePhoto(photo.id)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform hover:scale-110"
                  style={{ backgroundColor: 'rgba(26,16,64,0.85)' }}
                >
                  ✕
                </button>
              </div>
            ))}
            {canAdd && (
              <button
                onClick={() => galleryRef.current?.click()}
                className="flex-shrink-0 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all hover:bg-gray-100"
                style={{ width: 110, height: 140, border: '2px dashed #ccc', backgroundColor: '#F9F9F9' }}
              >
                <span className="text-xl text-gray-400">+</span>
                <span className="text-xs text-gray-400">Əlavə et</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Camera modal ───────────────────────────────────────── */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {/* Video + guide overlay */}
          <div className="relative flex-1 overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* SVG shape overlay */}
            {guide.id !== 'none' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <svg
                  viewBox={guide.viewBox}
                  fill="none"
                  stroke="white"
                  strokeWidth="1.5"
                  style={{
                    width: guide.overlayW,
                    height: guide.overlayH,
                    opacity: 0.5,
                    filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.35))',
                  }}
                >
                  {guide.paths}
                </svg>
              </div>
            )}

            {/* Guide label top */}
            {guide.id !== 'none' && (
              <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
                <div
                  className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                >
                  {guide.icon} {guide.label}
                </div>
              </div>
            )}
          </div>

          {/* Bottom controls bar */}
          <div
            className="flex items-center justify-between px-8 py-6 flex-shrink-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          >
            {/* Close */}
            <button
              onClick={closeCamera}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg transition-opacity hover:opacity-70"
              style={{ border: '2px solid rgba(255,255,255,0.3)' }}
              aria-label="Bağla"
            >
              ✕
            </button>

            {/* Capture */}
            <button
              onClick={capturePhoto}
              className="w-20 h-20 rounded-full transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
              style={{ backgroundColor: 'white', border: '4px solid rgba(255,255,255,0.4)', padding: 5 }}
              aria-label="Şəkil çək"
            >
              <div className="w-full h-full rounded-full" style={{ backgroundColor: '#FF2D78' }} />
            </button>

            {/* Flip */}
            <button
              onClick={flipCamera}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg transition-opacity hover:opacity-70"
              style={{ border: '2px solid rgba(255,255,255,0.3)' }}
              aria-label="Kameranı çevir"
            >
              🔄
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
