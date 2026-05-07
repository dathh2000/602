'use client'
import { useState } from 'react'
import { updateDoc, deleteField } from 'firebase/firestore'
import { billDoc } from '@/src/lib/firebase/collections'
import { BottomSheet } from '@/src/components/ui/BottomSheet'
import { ImageUpload } from '@/src/components/ui/ImageUpload'
import { formatAmountInput, parseAmountInput } from '@/src/lib/utils'
import type { Bill, BillCategory } from '@/src/types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  bill: Bill
  roomId: string
}

export function EditBillSheet({ open, onClose, bill, roomId }: Props) {
  const [title, setTitle]                       = useState(bill.title)
  const [amount, setAmount]                     = useState(formatAmountInput(String(bill.amount)))
  const [dueDay, setDueDay]                     = useState(String(bill.dueDay))
  const [category, setCategory]                 = useState<BillCategory>(bill.category)
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(String(bill.notifyDaysBefore))
  const [imageUrls, setImageUrls]               = useState<string[]>(
    bill.imageUrls && bill.imageUrls.length > 0 ? bill.imageUrls : bill.imageUrl ? [bill.imageUrl] : []
  )
  const [note, setNote]                         = useState(bill.note ?? '')
  const [saving, setSaving]                     = useState(false)

  async function handleSave() {
    const amt = parseAmountInput(amount)
    if (!title.trim() || !amt) { toast.error('Nhập đủ thông tin'); return }
    const day = parseInt(dueDay)
    if (day < 1 || day > 31) { toast.error('Ngày không hợp lệ (1-31)'); return }

    setSaving(true)
    try {
      await updateDoc(billDoc(roomId, bill.id), {
        title: title.trim(),
        amount: amt,
        dueDay: day,
        category,
        notifyDaysBefore: parseInt(notifyDaysBefore),
        imageUrls,
        ...(note.trim() ? { note: note.trim() } : { note: deleteField() }),
      })
      toast.success('Đã cập nhật hóa đơn!')
      onClose()
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="✏️ Sửa hóa đơn">

      <label className="text-xs text-amber-700 font-semibold">TÊN HÓA ĐƠN</label>
      <input value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Tiền điện, tiền nước..."
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3" />

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-xs text-amber-700 font-semibold">SỐ TIỀN (₫)</label>
          <input value={amount} onChange={e => setAmount(formatAmountInput(e.target.value))}
            inputMode="numeric" placeholder="450.000"
            className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1" />
        </div>
        <div>
          <label className="text-xs text-amber-700 font-semibold">NGÀY ĐẾN HẠN</label>
          <input value={dueDay} onChange={e => setDueDay(e.target.value)} type="number" min="1" max="31"
            className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1" />
        </div>
      </div>

      <label className="text-xs text-amber-700 font-semibold">LOẠI</label>
      <select value={category} onChange={e => setCategory(e.target.value as BillCategory)}
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3">
        <option value="rent">🏠 Tiền phòng</option>
        <option value="electric">💡 Tiền điện</option>
        <option value="water">🚰 Tiền nước</option>
        <option value="internet">📶 Internet</option>
        <option value="other">📌 Khác</option>
      </select>

      <label className="text-xs text-amber-700 font-semibold">NHẮC TRƯỚC (ngày)</label>
      <input value={notifyDaysBefore} onChange={e => setNotifyDaysBefore(e.target.value)}
        type="number" min="1" max="14"
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3" />

      <label className="text-xs text-amber-700 font-semibold">GHI CHÚ (tuỳ chọn)</label>
      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú thêm..."
        rows={2}
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3 resize-none" />

      <label className="text-xs text-amber-700 font-semibold mb-2 block">ẢNH HÓA ĐƠN (tuỳ chọn)</label>
      <div className="mb-4">
        <ImageUpload value={imageUrls} onChange={setImageUrls} max={5} />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-gradient-to-r from-amber-400 to-red-500 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50">
        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </BottomSheet>
  )
}
