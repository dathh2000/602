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
    <div ref={ref} className="text-center text-xs text-gray-400 py-3">
      Đang tải thêm...
    </div>
  )
}
