// Lưu / share ảnh từ URL về thiết bị, tối ưu cho mobile.
// Ưu tiên Web Share API (mở sheet "Lưu vào Ảnh" / "Lưu vào Tệp" trên iOS/Android),
// fallback download qua blob URL, fallback cuối là mở tab mới để user long-press.

export async function saveOrShareImage(url: string, filename: string): Promise<'shared' | 'downloaded' | 'opened'> {
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) throw new Error(`fetch ${res.status}`)
    const blob = await res.blob()
    const type = blob.type || 'image/png'
    const file = new File([blob], filename, { type })

    // Web Share API (iOS/Android PWA, modern browsers)
    if (typeof navigator !== 'undefined' && 'share' in navigator
        && typeof navigator.canShare === 'function'
        && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] })
      return 'shared'
    }

    // Fallback: download qua blob URL
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    return 'downloaded'
  } catch (err) {
    console.warn('saveOrShareImage failed, falling back to open:', err)
    if (typeof window !== 'undefined') window.open(url, '_blank')
    return 'opened'
  }
}
