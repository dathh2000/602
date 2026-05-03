'use client'
import { useRef, useState } from 'react'

interface Props {
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
}

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/cloudinary', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Upload thất bại')
  return data.url as string
}

export function ImageUpload({ value, onChange, max = 5 }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const remaining = Math.max(0, max - value.length)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError('')

    const slots = Math.max(0, max - value.length)
    if (slots <= 0) {
      setError(`Tối đa ${max} ảnh`)
      return
    }
    const accepted = Array.from(files).slice(0, slots)

    setUploading(true)
    const newUrls: string[] = []
    try {
      for (const file of accepted) {
        try {
          const url = await uploadImage(file)
          newUrls.push(url)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Upload thất bại')
        }
      }
      if (newUrls.length > 0) onChange([...value, ...newUrls])
    } finally {
      setUploading(false)
      if (galleryRef.current) galleryRef.current.value = ''
      if (cameraRef.current) cameraRef.current.value = ''
    }
  }

  function handleRemove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url, i) => (
            <div key={url + i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-amber-200 bg-white">
              <img src={url} alt={`upload ${i}`} className="w-full h-full object-cover" />
              <button onClick={() => handleRemove(i)} type="button"
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center active:bg-black/80">
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {remaining > 0 && (
        <div className="flex gap-2">
          <input ref={galleryRef} type="file" accept="image/*" multiple
            onChange={e => handleFiles(e.target.files)}
            className="hidden" id="img-gallery" />
          <label htmlFor="img-gallery"
            className="flex-1 flex items-center justify-center gap-1 border-2 border-dashed border-amber-300 rounded-xl py-3 text-amber-600 text-xs font-semibold cursor-pointer active:bg-amber-50">
            🖼️ Thư viện
          </label>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment"
            onChange={e => handleFiles(e.target.files)}
            className="hidden" id="img-camera" />
          <label htmlFor="img-camera"
            className="flex-1 flex items-center justify-center gap-1 border-2 border-dashed border-amber-300 rounded-xl py-3 text-amber-600 text-xs font-semibold cursor-pointer active:bg-amber-50">
            📷 Chụp ảnh
          </label>
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center">
        {uploading
          ? 'Đang tải lên...'
          : `${value.length}/${max} ảnh${remaining === 0 ? ' (đã đủ)' : ''}`}
      </p>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
    </div>
  )
}
