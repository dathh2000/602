'use client'
import { useEffect, useRef } from 'react'

interface Props {
  hasMore: boolean
  onLoadMore: () => void
  rootMargin?: string
}

export function InfiniteScrollSentinel({ hasMore, onLoadMore, rootMargin = '120px' }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onLoadMore() },
      { rootMargin },
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore, rootMargin])

  if (!hasMore) {
    return <p className="text-center text-xs text-gray-400 py-3">— Hết —</p>
  }
  return (
    <div ref={ref} className="flex items-center justify-center gap-2 py-3">
      <span className="inline-block w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs text-amber-700">Đang tải thêm...</span>
    </div>
  )
}
