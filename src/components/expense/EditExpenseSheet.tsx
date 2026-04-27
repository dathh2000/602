'use client'
import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { expensesCol } from '@/src/lib/firebase/collections'
import { BottomSheet } from '@/src/components/ui/BottomSheet'
import { Avatar } from '@/src/components/ui/Avatar'
import { formatVND, formatAmountInput, parseAmountInput } from '@/src/lib/utils'
import { computeAllSettled } from '@/src/lib/expense'
import type { Expense, Member, ExpenseCategory } from '@/src/types'
import toast from 'react-hot-toast'

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'food',      label: '🍜 Đồ ăn'    },
  { value: 'grocery',   label: '🛒 Đi chợ'   },
  { value: 'transport', label: '🚗 Di chuyển' },
  { value: 'repair',    label: '🔧 Sửa chữa' },
  { value: 'other',     label: '📌 Khác'      },
]

interface Props {
  open: boolean
  onClose: () => void
  expense: Expense
  members: Member[]
  roomId: string
}

export function EditExpenseSheet({ open, onClose, expense, members, roomId }: Props) {
  const [title, setTitle]           = useState(expense.title)
  const [amount, setAmount]         = useState(formatAmountInput(String(expense.amount)))
  const [paidBy, setPaidBy]         = useState(expense.paidBy)
  const [participants, setParticipants] = useState<string[]>(expense.participants)
  const [category, setCategory]     = useState<ExpenseCategory>(expense.category)
  const [saving, setSaving]         = useState(false)

  const amountNum = parseAmountInput(amount)
  const share = participants.length > 0 ? amountNum / participants.length : 0

  function toggleParticipant(uid: string) {
    setParticipants(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    )
  }

  async function handleSave() {
    if (!title.trim() || amountNum <= 0) { toast.error('Nhập đủ thông tin'); return }
    if (!expense.paidFromFund && participants.length === 0) { toast.error('Chọn ít nhất 1 người'); return }

    setSaving(true)
    try {
      // Tính lại settlements từ đầu (không ai đã trả khi được phép edit)
      const newSettlements = Object.fromEntries(
        members.map(m => {
          const isParticipant = participants.includes(m.id)
          const isPayer       = m.id === paidBy
          const paid = !isParticipant || isPayer
          return [m.id, { paid, paidAt: null }]
        })
      )
      const finalParticipants = expense.paidFromFund ? [] : participants
      const allSettled = expense.paidFromFund ? true : computeAllSettled(finalParticipants, newSettlements)

      await updateDoc(doc(expensesCol(roomId), expense.id), {
        title: title.trim(),
        amount: amountNum,
        paidBy,
        participants: finalParticipants,
        category,
        settlements: newSettlements,
        allSettled,
        updatedAt: serverTimestamp(),
      })

      toast.success('Đã cập nhật chi tiêu!')
      onClose()
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="✏️ Sửa chi tiêu">

      <label className="text-xs text-amber-700 font-semibold">MÔ TẢ</label>
      <input value={title} onChange={e => setTitle(e.target.value)}
        placeholder="Đồ ăn tối, tiền điện..."
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3" />

      <label className="text-xs text-amber-700 font-semibold">SỐ TIỀN (₫)</label>
      <input value={amount} onChange={e => setAmount(formatAmountInput(e.target.value))}
        inputMode="numeric" placeholder="90.000"
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3 font-bold text-red-500" />

      <label className="text-xs text-amber-700 font-semibold">LOẠI</label>
      <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3">
        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>

      <label className="text-xs text-amber-700 font-semibold">NGƯỜI CHI</label>
      <select value={paidBy} onChange={e => setPaidBy(e.target.value)}
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3">
        {members.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}
      </select>

      {!expense.paidFromFund && (
        <>
          <label className="text-xs text-amber-700 font-semibold mb-2 block">CHIA CHO AI?</label>
          <div className="bg-yellow-50 border-2 border-amber-200 rounded-xl p-2 mb-4 space-y-1">
            {members.map((m, i) => {
              const checked = participants.includes(m.id)
              return (
                <button key={m.id} onClick={() => toggleParticipant(m.id)}
                  className="w-full flex items-center gap-2 p-1">
                  <div className={`w-4 h-4 rounded flex items-center justify-center border-2 text-xs
                    ${checked ? 'bg-amber-400 border-amber-400 text-white' : 'border-amber-300'}`}>
                    {checked ? '✓' : ''}
                  </div>
                  <Avatar name={m.displayName} index={i} />
                  <span className="text-sm flex-1 text-left">{m.displayName}</span>
                  {checked && <span className="text-xs text-amber-600 font-semibold">{formatVND(share)}</span>}
                </button>
              )
            })}
          </div>
        </>
      )}

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-gradient-to-r from-amber-400 to-red-500 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50">
        {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
      </button>
    </BottomSheet>
  )
}
