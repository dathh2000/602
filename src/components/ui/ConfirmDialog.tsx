'use client'
interface Props {
  open: boolean
  title: string
  message: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  variant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open, title, message,
  confirmLabel = '✓ Xác nhận',
  cancelLabel = 'Huỷ',
  loading, variant = 'primary',
  onConfirm, onCancel,
}: Props) {
  if (!open) return null
  const confirmCls = variant === 'danger'
    ? 'bg-red-500 text-white'
    : 'bg-gradient-to-r from-amber-400 to-red-500 text-white'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6"
      onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-2xl p-5 w-full max-w-xs shadow-xl"
        onClick={e => e.stopPropagation()}>
        <p className="text-base font-extrabold text-gray-800 mb-1 text-center">{title}</p>
        <div className="text-xs text-gray-500 text-center mb-4">{message}</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCancel}
            className="py-2 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-500">
            {cancelLabel}
          </button>
          <button disabled={loading} onClick={onConfirm}
            className={`py-2 rounded-xl ${confirmCls} text-sm font-bold disabled:opacity-50`}>
            {loading ? '⏳ Đang lưu...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
