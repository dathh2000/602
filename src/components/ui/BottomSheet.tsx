'use client'
import { useEffect } from 'react'

interface Props { open: boolean; onClose: () => void; children: React.ReactNode }

export function BottomSheet({ open, onClose, children }: Props) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-2xl p-4 pb-8 max-h-[90vh] overflow-y-auto">
        <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <button onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-xs font-bold hover:bg-gray-200">
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}
