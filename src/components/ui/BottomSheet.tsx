'use client'
import { useEffect } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export function BottomSheet({ open, onClose, children, title }: Props) {
  useEffect(() => {
    const root = document.getElementById('scroll-root')
    if (root) root.style.overflow = open ? 'hidden' : 'auto'
    return () => { if (root) root.style.overflow = 'auto' }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end"
      onTouchMove={e => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose}
        onTouchMove={e => e.preventDefault()} />
      <div className="relative w-full bg-white rounded-t-2xl max-h-[85vh] flex flex-col"
        style={{ overscrollBehavior: 'contain' }}>

        {/* Sticky header */}
        <div className="shrink-0 bg-white rounded-t-2xl pt-3 px-4 pb-2 border-b border-gray-100">
          <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between min-h-[1.75rem]">
            {title
              ? <h2 className="text-sm font-extrabold text-amber-800">{title}</h2>
              : <span />
            }
            <button onClick={onClose}
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
