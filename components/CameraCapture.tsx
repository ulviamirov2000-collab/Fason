'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export type PhotoEntry = {
  id: string
  previewUrl: string
  storageUrl: string | null
  uploading: boolean
  uploadError: string | null
}

interface Props {
  userId: string
  onChange: (photos: PhotoEntry[]) => void
  maxPhotos?: number
}

function IconCamera() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  )
}

function IconGallery() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}

function IconRefresh() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4v6h6"/><path d="M23 20v-6h-6"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

export default function CameraCapture({ userId, onChange, maxPhotos = 5 }: Props) {
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [photos, setPhotos] = useState<PhotoEntry[]>([])

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const facingRef = useRef<'environment' | 'user'>('environment')

  const onChangeRef = useRef(onChange)
  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { onChangeRef.current(photos) }, [photos])

  useEffect(() => {
    if (cameraOpen) startStream()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen])

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

  function closeCamera() { stopStream(); setCameraOpen(false) }

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
      const entry: PhotoEntry = { id: entryId, previewUrl: URL.createObjectURL(blob), storageUrl: null, uploading: true, uploadError: null }
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
      setPhotos((prev) => prev.map((p) => p.id === entryId ? { ...p, uploading: false, uploadError: error?.message ?? 'Xəta' } : p))
      return
    }
    const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(data.path)
    setPhotos((prev) => prev.map((p) => p.id === entryId ? { ...p, uploading: false, storageUrl: publicUrl, previewUrl: publicUrl } : p))
  }

  async function validateFile(file: File): Promise<boolean> {
    const FILE_ERR = 'Yalnız şəkil faylı yükləyə bilərsiniz (maks. 5MB)'
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setFileError(FILE_ERR); return false }
    if (file.size > 5 * 1024 * 1024) { setFileError(FILE_ERR); return false }
    try {
      const buf = await file.slice(0, 12).arrayBuffer()
      const b = new Uint8Array(buf)
      const isJpeg = b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF
      const isPng  = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47
      const isWebp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
                  && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
      if (!isJpeg && !isPng && !isWebp) { setFileError(FILE_ERR); return false }
    } catch { setFileError(FILE_ERR); return false }
    setFileError(null)
    return true
  }

  async function handleGalleryFiles(files: FileList | null) {
    if (!files) return
    const candidates = Array.from(files).slice(0, maxPhotos - photos.length)
    const validated: File[] = []
    for (const file of candidates) {
      if (await validateFile(file)) validated.push(file)
    }
    if (validated.length === 0) return
    const entries: PhotoEntry[] = validated.map((file) => ({
      id: Math.random().toString(36).slice(2),
      previewUrl: URL.createObjectURL(file),
      storageUrl: null, uploading: true, uploadError: null,
    }))
    setPhotos((prev) => [...prev, ...entries])
    await Promise.all(entries.map((entry, i) => uploadBlob(validated[i], entry.id)))
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  const canAdd = photos.length < maxPhotos

  return (
    <div className="flex flex-col gap-4">

      {/* Upload buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => canAdd && setCameraOpen(true)}
          disabled={!canAdd}
          className="flex flex-col items-center justify-center gap-2.5 py-6 rounded-2xl font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: '#1a1040', color: 'white', minHeight: 92 }}
        >
          <IconCamera />
          <span className="text-xs tracking-wide">Kamera ilə çək</span>
        </button>
        <button
          onClick={() => canAdd && galleryRef.current?.click()}
          disabled={!canAdd}
          className="flex flex-col items-center justify-center gap-2.5 py-6 rounded-2xl font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
          style={{ backgroundColor: '#FF2D78', color: 'white', minHeight: 92 }}
        >
          <IconGallery />
          <span className="text-xs tracking-wide">Qalereyadan seç</span>
        </button>
      </div>

      <p className="text-xs text-center text-gray-400">
        {photos.length}/{maxPhotos} foto · JPEG, PNG, WEBP · Maks 5 MB
      </p>

      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => handleGalleryFiles(e.target.files)} />
      <canvas ref={canvasRef} className="hidden" />

      {cameraError && (
        <div className="text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: '#FFF0F5', color: '#FF2D78', border: '1.5px solid #FF2D78' }}>
          ⚠ {cameraError}
        </div>
      )}
      {fileError && (
        <div className="text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: '#FFF0F5', color: '#FF2D78', border: '1.5px solid #FF2D78' }}>
          ⚠ {fileError}
        </div>
      )}

      {/* Photo previews */}
      {photos.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <div key={photo.id} className="relative flex-shrink-0 rounded-2xl overflow-hidden"
              style={{ width: 100, height: 128, border: i === 0 ? '2.5px solid #FF2D78' : '2px solid #e5e7eb' }}>
              <Image src={photo.previewUrl} alt={`Foto ${i + 1}`} fill className="object-cover" unoptimized />
              {photo.uploading && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(26,16,64,0.55)' }}>
                  <div className="w-7 h-7 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                </div>
              )}
              {photo.uploadError && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(255,45,120,0.65)' }}>
                  <span className="text-white text-xs font-bold px-1 text-center">⚠ Xəta</span>
                </div>
              )}
              {i === 0 && !photo.uploading && (
                <div className="absolute bottom-0 left-0 right-0 py-1 text-center text-xs font-bold" style={{ backgroundColor: '#FF2D78', color: 'white' }}>
                  Əsas foto
                </div>
              )}
              <button onClick={() => removePhoto(photo.id)}
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: 'rgba(26,16,64,0.85)' }}>
                ✕
              </button>
            </div>
          ))}
          {canAdd && (
            <button onClick={() => galleryRef.current?.click()}
              className="flex-shrink-0 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors hover:bg-gray-100"
              style={{ width: 100, height: 128, border: '2px dashed #d1d5db', backgroundColor: '#F9F9F9' }}>
              <span className="text-2xl text-gray-300">+</span>
              <span className="text-xs text-gray-400">Əlavə et</span>
            </button>
          )}
        </div>
      )}

      {/* Camera modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="relative flex-1 overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="flex items-center justify-between px-8 py-6 flex-shrink-0" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
            <button onClick={closeCamera}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white"
              style={{ border: '2px solid rgba(255,255,255,0.3)' }} aria-label="Bağla">
              <IconClose />
            </button>
            <button onClick={capturePhoto}
              className="w-20 h-20 rounded-full flex items-center justify-center transition-transform active:scale-95"
              style={{ backgroundColor: 'white', border: '4px solid rgba(255,255,255,0.35)', padding: 5 }} aria-label="Şəkil çək">
              <div className="w-full h-full rounded-full" style={{ backgroundColor: '#FF2D78' }} />
            </button>
            <button onClick={flipCamera}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white"
              style={{ border: '2px solid rgba(255,255,255,0.3)' }} aria-label="Kameranı çevir">
              <IconRefresh />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
