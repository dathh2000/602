'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

const CLOSE_THRESHOLD_PX = 120
const VELOCITY_THRESHOLD = 0.5 // px/ms

export function BottomSheet({ open, onClose, children, title }: Props) {
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<{ y: number; t: number } | null>(null)
  const lastMove = useRef<{ y: number; t: number } | null>(null)

  useEffect(() => {
    const root = document.getElementById('scroll-root')
    if (root) root.style.overflow = open ? 'hidden' : 'auto'
    return () => { if (root) root.style.overflow = 'auto' }
  }, [open])

  useEffect(() => {
    if (!open) setDragY(0)
  }, [open])

  function onPointerDown(e: React.PointerEvent) {
    dragStart.current = { y: e.clientY, t: Date.now() }
    lastMove.current = { y: e.clientY, t: Date.now() }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragStart.current) return
    const dy = Math.max(0, e.clientY - dragStart.current.y) // chỉ kéo xuống
    setDragY(dy)
    lastMove.current = { y: e.clientY, t: Date.now() }
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!dragStart.current) return
    const dy = Math.max(0, e.clientY - dragStart.current.y)
    let velocity = 0
    if (lastMove.current && dragStart.current) {
      const dt = lastMove.current.t - dragStart.current.t
      if (dt > 0) velocity = (lastMove.current.y - dragStart.current.y) / dt
    }
    dragStart.current = null
    lastMove.current = null
    ;(e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId)

    if (dy > CLOSE_THRESHOLD_PX || velocity > VELOCITY_THRESHOLD) {
      onClose()
    } else {
      setDragY(0)
    }
  }

  if (!open) return null

  const isDragging = dragStart.current !== null
  const sheetTransform = `translateY(${dragY}px)`
  const overlayOpacity = Math.max(0, 1 - dragY / 400)

  return (
    <div className="fixed inset-0 z-50 flex items-end"
      onTouchMove={e => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose}
        style={{ opacity: overlayOpacity }}
        onTouchMove={e => e.preventDefault()} />
      <div
        className="relative w-full bg-white rounded-t-2xl max-h-[85vh] flex flex-col"
        style={{
          overscrollBehavior: 'contain',
          transform: sheetTransform,
          transition: isDragging ? 'none' : 'transform 200ms ease-out',
        }}>

        {/* Sticky header — đây là drag handle để kéo đóng */}
        <div
          className="shrink-0 bg-white rounded-t-2xl pt-3 px-4 pb-2 border-b border-gray-100 cursor-grab active:cursor-grabbing touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}>
          <div className="w-8 h-1 bg-gray-300 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between min-h-[1.75rem]">
            {title
              ? <h2 className="text-sm font-extrabold text-amber-800">{title}</h2>
              : <span />
            }
            <button onClick={onClose}
              onPointerDown={e => e.stopPropagation()}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xs font-bold hover:bg-gray-200 shrink-0">
              ✕
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-8"
          style={{ WebkitOverflowScrolling: 'touch' as const }}>
          {children}
        </div>
      </div>
    </div>
  )
}
