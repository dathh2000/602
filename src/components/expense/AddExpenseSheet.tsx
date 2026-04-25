'use client'
import { useState } from 'react'
import { addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore'
import { expensesCol, fundDoc, fundTxCol } from '@/src/lib/firebase/collections'
import { BottomSheet } from '@/src/components/ui/BottomSheet'
import { Avatar } from '@/src/components/ui/Avatar'
import { formatVND } from '@/src/lib/utils'
import type { Member, ExpenseCategory } from '@/src/types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  roomId: string
  members: Member[]
  currentUserId: string
  fundBalance: number
}

export function AddExpenseSheet({ open, onClose, roomId, members, currentUserId, fundBalance }: Props) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [participants, setParticipants] = useState<string[]>(members.map(m => m.id))
  const [useFund, setUseFund] = useState(false)
  const [saving, setSaving] = useState(false)

  const amountNum = parseFloat(amount.replace(/[^0-9.]/g, '')) || 0
  const share = participants.length > 0 ? amountNum / participants.length : 0

  function toggleParticipant(uid: string) {
    setParticipants(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])
  }

  function handleClose() {
    setTitle(''); setAmount(''); setUseFund(false)
    setParticipants(members.map(m => m.id))
    setPaidBy(currentUserId)
    onClose()
  }

  async function handleSave() {
    if (!title.trim() || amountNum <= 0) { toast.error('Nhập đủ thông tin'); return }
    if (useFund && amountNum > fundBalance) { toast.error(`Quỹ không đủ (còn ${formatVND(fundBalance)})`); return }
    if (!useFund && participants.length === 0) { toast.error('Chọn ít nhất 1 người'); return }

    setSaving(true)
    try {
      const settlements = Object.fromEntries(
        members.map(m => [m.id, {
          paid: !participants.includes(m.id) || (m.id === paidBy && !useFund),
          paidAt: null,
        }])
      )

      await addDoc(expensesCol(roomId), {
        title: title.trim(),
        amount: amountNum,
        paidBy,
        participants: useFund ? [] : participants,
        category: 'other' as ExpenseCategory,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        paidFromFund: useFund,
        settlements,
      })

      if (useFund) {
        await updateDoc(fundDoc(roomId), { balance: increment(-amountNum) })
        await addDoc(fundTxCol(roomId), {
          type: 'withdraw',
          amount: amountNum,
          userId: currentUserId,
          note: title.trim(),
          relatedExpenseId: null,
          createdAt: serverTimestamp(),
        })
      }

      // Notify participants via Zalo (fire-and-forget)
      fetch('/api/notifications/expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          expenseTitle: title.trim(),
          amount: amountNum,
          paidBy,
          participants: useFund ? [] : participants,
        }),
      }).catch(() => {}) // non-critical

      toast.success('Đã lưu chi tiêu!')
      handleClose()
    } catch (e) {
      toast.error('Có lỗi xảy ra, thử lại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose}>
      <h2 className="text-sm font-extrabold text-amber-800 mb-3">➕ Thêm chi tiêu</h2>

      <label className="text-xs text-amber-700 font-semibold">MÔ TẢ</label>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Đồ ăn tối, tiền điện..."
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3" />

      <label className="text-xs text-amber-700 font-semibold">SỐ TIỀN (₫)</label>
      <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="90000" inputMode="numeric"
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3 font-bold text-red-500" />

      <label className="text-xs text-amber-700 font-semibold">NGƯỜI CHI</label>
      <select value={paidBy} onChange={e => setPaidBy(e.target.value)}
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3">
        {members.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}
      </select>

      <label className="text-xs text-amber-700 font-semibold mb-2 block">THANH TOÁN BẰNG</label>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={() => setUseFund(false)}
          className={`rounded-xl py-2 text-xs font-bold border-2 ${!useFund ? 'bg-amber-100 border-amber-400 text-amber-800' : 'border-gray-200 text-gray-400'}`}>
          👤 Cá nhân chi
        </button>
        <button onClick={() => setUseFund(true)}
          className={`rounded-xl py-2 text-xs font-bold border-2 ${useFund ? 'bg-green-100 border-green-400 text-green-800' : 'border-gray-200 text-gray-400'}`}>
          💰 Dùng quỹ<br/><span className="font-normal text-[10px]">còn {formatVND(fundBalance)}</span>
        </button>
      </div>

      {!useFund && (
        <>
          <label className="text-xs text-amber-700 font-semibold mb-2 block">CHIA CHO AI?</label>
          <div className="bg-yellow-50 border-2 border-amber-200 rounded-xl p-2 mb-3 space-y-1">
            {members.map((m, i) => {
              const checked = participants.includes(m.id)
              return (
                <button key={m.id} onClick={() => toggleParticipant(m.id)}
                  className="w-full flex items-center gap-2 p-1">
                  <div className={`w-4 h-4 rounded flex items-center justify-center border-2 text-xs ${checked ? 'bg-amber-400 border-amber-400 text-white' : 'border-amber-300'}`}>
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
        {saving ? 'Đang lưu...' : 'Lưu chi tiêu'}
      </button>
    </BottomSheet>
  )
}
