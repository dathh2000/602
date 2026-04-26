'use client'
import { useRef, useState } from 'react'

interface Props {
  onUploaded: (url: string | null) => void
  initialUrl?: string | null
}

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/cloudinary', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Upload thất bại')
  return data.url as string
}

export function ImageUpload({ onUploaded, initialUrl = null }: Props) {
  const [preview, setPreview] = useState<string | null>(initialUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const url = await uploadImage(file)
      onUploaded(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload thất bại')
      setPreview(null)
      onUploaded(null)
    } finally {
      setUploading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  function handleRemove() {
    setPreview(null)
    setError('')
    onUploaded(null)
    if (galleryRef.current) galleryRef.current.value = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  if (preview) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden border-2 border-amber-200">
        <img src={preview} alt="preview" className="w-full max-h-48 object-cover" />
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-bold animate-pulse">Đang tải lên...</span>
          </div>
        )}
        {!uploading && (
          <button onClick={handleRemove}
            className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
            ✕
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <input ref={galleryRef} type="file" accept="image/*" onChange={handleChange} className="hidden" id="img-gallery" />
        <label htmlFor="img-gallery"
          className="flex-1 flex items-center justify-center gap-1 border-2 border-dashed border-amber-300 rounded-xl py-3 text-amber-600 text-xs font-semibold cursor-pointer active:bg-amber-50">
          🖼️ Thư viện
        </label>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handleChange} className="hidden" id="img-camera" />
        <label htmlFor="img-camera"
          className="flex-1 flex items-center justify-center gap-1 border-2 border-dashed border-amber-300 rounded-xl py-3 text-amber-600 text-xs font-semibold cursor-pointer active:bg-amber-50">
          📷 Chụp ảnh
        </label>
      </div>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  )
}
