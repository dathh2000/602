'use client'
import { useState } from 'react'
import { updateDoc } from 'firebase/firestore'
import { billDoc } from '@/src/lib/firebase/collections'
import { BottomSheet } from '@/src/components/ui/BottomSheet'
import { Tag } from '@/src/components/ui/Tag'
import { EditBillSheet } from '@/src/components/bill/EditBillSheet'
import { formatVND, formatDate, daysUntilDue, getImages } from '@/src/lib/utils'
import type { Bill } from '@/src/types'
import toast from 'react-hot-toast'

const CATEGORY_LABEL: Record<string, string> = {
  rent: '🏠 Tiền phòng', electric: '💡 Tiền điện', water: '🚰 Tiền nước',
  internet: '📶 Internet', other: '📌 Khác',
}

interface Props {
  open: boolean
  onClose: () => void
  bill: Bill
  roomId: string
}

export function BillDetailSheet({ open, onClose, bill, roomId }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const days   = daysUntilDue(bill.dueDay)
  const urgent = days <= 3
  const isPaid = bill.paid === true

  async function handleDelete() {
    setDeleting(true)
    try {
      await updateDoc(billDoc(roomId, bill.id), { active: false })
      toast.success('Đã xoá hóa đơn!')
      setConfirming(false)
      onClose()
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={`📅 ${bill.title}`}>
        <div className="space-y-4">

          {/* Header */}
          <div>
            <div className="flex justify-between items-start mb-1">
              <h2 className="text-base font-extrabold text-gray-800 flex-1 pr-2">{bill.title}</h2>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setEditOpen(true)}
                  className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-700">
                  ✏️ Sửa
                </button>
                <span className="text-lg font-extrabold text-red-500">{formatVND(bill.amount)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Tag label={CATEGORY_LABEL[bill.category] ?? '📌 Khác'} variant="yellow" />
              {isPaid
                ? <Tag label="✓ Đã đóng" variant="green" />
                : <Tag label={urgent ? `⏰ ${days} ngày nữa` : `${days} ngày nữa`} variant={urgent ? 'red' : 'yellow'} />
              }
            </div>
          </div>

          {/* Ghi chú */}
          {bill.note && (
            <div className="bg-yellow-50 border-2 border-amber-100 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-amber-600 font-bold uppercase mb-1">Ghi chú</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{bill.note}</p>
            </div>
          )}

          {/* Ảnh đính kèm */}
          {(() => {
            const images = getImages(bill)
            if (images.length === 0) return null
            return (
              <div>
                <p className="text-xs text-amber-700 font-bold uppercase mb-2">
                  Ảnh hóa đơn ({images.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {images.map((url, i) => (
                    <a key={url + i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`bill ${i + 1}`}
                        className="w-full aspect-square object-cover rounded-xl border-2 border-amber-100" />
                    </a>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Thông tin chi tiết */}
          <div className="bg-amber-50 rounded-xl p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Hạn đóng</span>
              <span className="font-semibold text-gray-800">Ngày {bill.dueDay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Số tiền</span>
              <span className="font-semibold text-gray-800">{formatVND(bill.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nhắc trước</span>
              <span className="font-semibold text-gray-800">{bill.notifyDaysBefore} ngày</span>
            </div>
            {isPaid && bill.paidAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Đã đóng</span>
                <span className="font-semibold text-green-600">{formatDate(bill.paidAt)}</span>
              </div>
            )}
          </div>

          {/* Delete */}
          <button onClick={() => setConfirming(true)} disabled={deleting}
            className="w-full border-2 border-red-200 text-red-500 rounded-xl py-2.5 font-bold text-sm disabled:opacity-50">
            🗑 Xoá hóa đơn
          </button>
        </div>
      </BottomSheet>

      {editOpen && (
        <EditBillSheet
          open={editOpen}
          onClose={() => setEditOpen(false)}
          bill={bill}
          roomId={roomId}
        />
      )}

      {/* Confirm delete dialog */}
      {confirming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          onClick={() => setConfirming(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-xs shadow-xl"
            onClick={e => e.stopPropagation()}>
            <p className="text-base font-extrabold text-gray-800 mb-1 text-center">Xoá hóa đơn?</p>
            <p className="text-xs text-gray-500 text-center mb-4">
              Hóa đơn <span className="font-semibold text-gray-700">{bill.title}</span> sẽ bị ẩn khỏi danh sách.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfirming(false)}
                className="py-2 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-500">
                Huỷ
              </button>
              <button disabled={deleting} onClick={handleDelete}
                className="py-2 rounded-xl bg-gradient-to-r from-amber-400 to-red-500 text-white text-sm font-bold disabled:opacity-50">
                {deleting ? '⏳ Đang xoá...' : '✓ Xoá'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
