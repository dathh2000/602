'use client'
import { useRef, useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '@/src/lib/firebase/config'

interface Props {
  onUploaded: (url: string | null) => void
  storagePath: string // e.g. rooms/roomId/expenses/expenseId
}

export function ImageUpload({ onUploaded, storagePath }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    try {
      const storageRef = ref(storage, `${storagePath}_${Date.now()}`)
      await uploadBytes(storageRef, file, { contentType: file.type })
      const url = await getDownloadURL(storageRef)
      onUploaded(url)
    } catch {
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
    onUploaded(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  if (preview) {
    return (
      <div className="relative w-full rounded-xl overflow-hidden border-2 border-amber-200">
        <img src={preview} alt="preview" className="w-full max-h-48 object-cover" />
        {uploading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-bold">Đang tải lên...</span>
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
    <div className="flex gap-2">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" id={`img-${storagePath}`} />
      <label htmlFor={`img-${storagePath}`}
        className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-amber-300 rounded-xl py-3 text-amber-600 text-xs font-semibold cursor-pointer active:bg-amber-50">
        🖼️ Chọn từ thư viện
      </label>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleChange} className="hidden" id={`cam-${storagePath}`} />
      <label htmlFor={`cam-${storagePath}`}
        className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-amber-300 rounded-xl py-3 text-amber-600 text-xs font-semibold cursor-pointer active:bg-amber-50">
        📷 Chụp ảnh
      </label>
    </div>
  )
}
