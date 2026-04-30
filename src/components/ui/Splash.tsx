'use client'
import { useEffect, useState } from 'react'

const MIN_SHOW_MS = 800       // hiển thị tối thiểu, tránh flash quá nhanh
const FADE_MS = 400
const SAFETY_TIMEOUT_MS = 6000 // nếu sau 6s vẫn chưa ready → buộc ẩn (tránh kẹt)

/**
 * Splash đợi event `app-ready` (route chủ động fire khi data đã load xong).
 * Min display 800ms, max 6s an toàn.
 */
export function Splash() {
  const [fading, setFading] = useState(false)
  const [removed, setRemoved] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const startTime = Date.now()
    let hideTimer: ReturnType<typeof setTimeout> | null = null
    let removeTimer: ReturnType<typeof setTimeout> | null = null

    const startHide = () => {
      const elapsed = Date.now() - startTime
      const wait = Math.max(0, MIN_SHOW_MS - elapsed)
      hideTimer = setTimeout(() => {
        setFading(true)
        removeTimer = setTimeout(() => setRemoved(true), FADE_MS)
      }, wait)
    }

    const onReady = () => {
      window.removeEventListener('app-ready', onReady)
      startHide()
    }

    window.addEventListener('app-ready', onReady)
    const safety = setTimeout(onReady, SAFETY_TIMEOUT_MS)

    return () => {
      window.removeEventListener('app-ready', onReady)
      if (hideTimer) clearTimeout(hideTimer)
      if (removeTimer) clearTimeout(removeTimer)
      clearTimeout(safety)
    }
  }, [])

  if (removed) return null

  return (
    <div
      className={`fixed inset-0 z-[999] bg-gradient-to-br from-amber-400 to-red-500 flex flex-col items-center justify-center text-white pointer-events-none transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}>
      <div className="text-7xl mb-4 animate-bounce">🏠</div>
      <h1 className="text-3xl font-extrabold tracking-tight">Phòng trọ</h1>
      <p className="text-xs opacity-80 mt-1">Quản lý chi tiêu nhóm</p>
      <div className="absolute bottom-10 flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse [animation-delay:200ms]" />
        <span className="w-2 h-2 rounded-full bg-white/70 animate-pulse [animation-delay:400ms]" />
      </div>
    </div>
  )
}

/** Helper để route fire khi data đã ready */
export function fireAppReady() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('app-ready'))
}
