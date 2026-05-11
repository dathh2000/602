'use client'
import { useRef, useState } from 'react'

interface Props {
  onSend: (text: string, imageUrls: string[]) => Promise<void>
  disabled?: boolean
}

async function uploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/cloudinary', { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Upload thất bại')
  return data.url as string
}

const MAX_IMAGES = 4

export function MessageInput({ onSend, disabled }: Props) {
  const [text, setText] = useState('')
  const [pendingImages, setPendingImages] = useState<string[]>([])
  const [uploadingCount, setUploadingCount] = useState(0)
  const [uploadError, setUploadError] = useState('')
  const [sending, setSending] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    // Count both ready images and in-flight uploads against MAX_IMAGES so the
    // user can't queue more than they can send.
    const slots = Math.max(0, MAX_IMAGES - pendingImages.length - uploadingCount)
    const accepted = Array.from(files).slice(0, slots)
    if (fileRef.current) fileRef.current.value = ''
    if (accepted.length === 0) return

    setUploadError('')
    setUploadingCount(c => c + accepted.length)

    let failures = 0
    for (const file of accepted) {
      try {
        const url = await uploadImage(file)
        setPendingImages(prev => [...prev, url])
      } catch {
        failures++
      } finally {
        setUploadingCount(c => c - 1)
      }
    }
    if (failures > 0) {
      setUploadError(failures === 1 ? 'Tải 1 ảnh thất bại' : `Tải ${failures} ảnh thất bại`)
    }
  }

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed && pendingImages.length === 0) return
    if (sending) return
    if (uploadingCount > 0) return  // block send until all uploads complete (Enter-key path)
    setSending(true)
    try {
      await onSend(trimmed, pendingImages)
      setText('')
      setPendingImages([])
      // reset textarea height after send
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } finally {
      setSending(false)
    }
  }

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const uploading = uploadingCount > 0
  const canSend = !sending && !uploading && (text.trim().length > 0 || pendingImages.length > 0)
  const attachFull = pendingImages.length + uploadingCount >= MAX_IMAGES

  return (
    <div className="border-t-2 border-amber-200 bg-amber-50 px-2 pt-2 space-y-2"
      style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}>
      {(pendingImages.length > 0 || uploading) && (
        <>
          <div className="flex gap-1 overflow-x-auto">
            {pendingImages.map((url, i) => (
              <div key={url + i} className="relative shrink-0">
                <img src={url} alt="" className="w-14 h-14 rounded-lg object-cover border border-amber-300" />
                <button onClick={() => setPendingImages(p => p.filter((_, idx) => idx !== i))}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-black/70 text-white rounded-full text-[10px] flex items-center justify-center">
                  ✕
                </button>
              </div>
            ))}
            {Array.from({ length: uploadingCount }).map((_, i) => (
              <div key={`up-${i}`}
                className="w-14 h-14 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0">
                <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ))}
          </div>
          {uploading && (
            <p className="text-[11px] text-amber-700 flex items-center gap-1">
              <span className="inline-block w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              Đang tải {uploadingCount} ảnh lên...
            </p>
          )}
          {uploadError && !uploading && (
            <p className="text-[11px] text-red-500">{uploadError}</p>
          )}
        </>
      )}
      <div className="flex items-end gap-2">
        <input ref={fileRef} type="file" accept="image/*" multiple
          onChange={e => handleFiles(e.target.files)} className="hidden" id="chat-img"
          disabled={attachFull || uploading} />
        <label htmlFor="chat-img"
          aria-disabled={attachFull || uploading}
          className={`w-9 h-9 rounded-full border flex items-center justify-center text-lg shrink-0 ${
            attachFull || uploading
              ? 'bg-amber-100 border-amber-200 opacity-50 pointer-events-none'
              : 'bg-white border-amber-200 active:bg-amber-100 cursor-pointer'
          }`}>
          📷
        </label>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => { setText(e.target.value); autoGrow(e.target) }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          rows={1}
          placeholder="Tin nhắn..."
          disabled={disabled}
          className="flex-1 resize-none bg-white border border-amber-200 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400 max-h-[120px]" />
        <button onClick={handleSend} disabled={!canSend}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${
            canSend
              ? 'bg-gradient-to-br from-amber-400 to-red-500 text-white active:opacity-80'
              : 'bg-amber-100 text-amber-300'
          }`}>
          {sending
            ? <span className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
            : '➤'}
        </button>
      </div>
    </div>
  )
}
