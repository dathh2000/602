'use client'
import { useState } from 'react'
import { addDoc, serverTimestamp } from 'firebase/firestore'
import { billsCol } from '@/src/lib/firebase/collections'
import { BottomSheet } from '@/src/components/ui/BottomSheet'
import { formatAmountInput, parseAmountInput } from '@/src/lib/utils'
import type { BillCategory } from '@/src/types'
import toast from 'react-hot-toast'

interface Props { open: boolean; onClose: () => void; roomId: string }

export function AddBillSheet({ open, onClose, roomId }: Props) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDay, setDueDay] = useState('1')
  const [category, setCategory] = useState<BillCategory>('other')
  const [notifyDaysBefore, setNotifyDaysBefore] = useState('3')
  const [saving, setSaving] = useState(false)

  function handleClose() {
    setTitle(''); setAmount('')
    onClose()
  }

  async function handleSave() {
    const amt = parseAmountInput(amount)
    if (!title.trim() || !amt) { toast.error('Nhập đủ thông tin'); return }
    const day = parseInt(dueDay)
    if (day < 1 || day > 31) { toast.error('Ngày không hợp lệ (1-31)'); return }
    setSaving(true)
    try {
      await addDoc(billsCol(roomId), {
        title: title.trim(),
        amount: amt,
        dueDay: day,
        category,
        notifyDaysBefore: parseInt(notifyDaysBefore),
        active: true,
        createdAt: serverTimestamp(),
      })
      toast.success('Đã thêm hóa đơn!')
      handleClose()
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <h2 className="text-sm font-extrabold text-amber-800 mb-3">📅 Thêm hóa đơn định kỳ</h2>

      <label className="text-xs text-amber-700 font-semibold">TÊN HÓA ĐƠN</label>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Tiền điện, tiền nước..."
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3" />

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-xs text-amber-700 font-semibold">SỐ TIỀN (₫)</label>
          <input value={amount} onChange={e => setAmount(formatAmountInput(e.target.value))} placeholder="450.000" inputMode="numeric"
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
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-4" />

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-gradient-to-r from-amber-400 to-red-500 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50">
        {saving ? 'Đang lưu...' : 'Thêm hóa đơn'}
      </button>
    </BottomSheet>
  )
}
