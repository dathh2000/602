'use client'
import { useState, useEffect } from 'react'
import { writeBatch, doc as fsDoc, serverTimestamp, increment } from 'firebase/firestore'
import { db } from '@/src/lib/firebase/config'
import { fundDoc, fundTxCol } from '@/src/lib/firebase/collections'
import { BottomSheet } from '@/src/components/ui/BottomSheet'
import { formatVND, formatAmountInput, parseAmountInput } from '@/src/lib/utils'
import type { FundTxType } from '@/src/types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  roomId: string
  currentUserId: string
  currentBalance: number
  defaultType?: FundTxType
}

export function FundSheet({ open, onClose, roomId, currentUserId, currentBalance, defaultType = 'deposit' }: Props) {
  const [type, setType] = useState<FundTxType>(defaultType)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setType(defaultType)
  }, [defaultType])

  const amountNum = parseAmountInput(amount)
  const preview = type === 'deposit' ? currentBalance + amountNum : currentBalance - amountNum

  function handleClose() {
    setAmount(''); setNote(''); onClose()
  }

  async function handleSave() {
    if (amountNum <= 0) { toast.error('Nhập số tiền'); return }
    if (type === 'withdraw' && amountNum > currentBalance) {
      toast.error(`Quỹ không đủ (còn ${formatVND(currentBalance)})`); return
    }
    setSaving(true)
    try {
      const batch = writeBatch(db)
      const delta = type === 'deposit' ? amountNum : -amountNum
      batch.set(fundDoc(roomId), { balance: increment(delta) }, { merge: true })
      const newTxRef = fsDoc(fundTxCol(roomId))
      batch.set(newTxRef, {
        type, amount: amountNum, userId: currentUserId,
        note: note.trim() || (type === 'deposit' ? 'Nạp quỹ' : 'Rút quỹ'),
        relatedExpenseId: null, createdAt: serverTimestamp(),
      })
      await batch.commit()
      toast.success(type === 'deposit' ? 'Đã nạp quỹ!' : 'Đã rút quỹ!')
      handleClose()
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="💰 Quỹ nhóm">
      <div className="grid grid-cols-2 gap-1 bg-amber-100 rounded-xl p-1 mb-4">
        {(['deposit', 'withdraw'] as const).map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`rounded-xl py-2 text-xs font-bold ${type === t ? 'bg-gradient-to-r from-amber-400 to-red-500 text-white' : 'text-gray-400'}`}>
            {t === 'deposit' ? '💵 Nạp quỹ' : '💸 Rút quỹ'}
          </button>
        ))}
      </div>

      <label className="text-xs text-amber-700 font-semibold">SỐ TIỀN (₫)</label>
      <input value={amount} onChange={e => setAmount(formatAmountInput(e.target.value))} inputMode="numeric"
        placeholder="200.000"
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3 font-bold text-green-600" />

      <label className="text-xs text-amber-700 font-semibold">GHI CHÚ</label>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Nạp quỹ tháng 5..."
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3" />

      {amountNum > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-xs">
          <p className="text-green-700 font-bold mb-1">Sau giao dịch</p>
          <div className="flex justify-between">
            <span className="text-gray-500">Hiện tại</span>
            <span>{formatVND(currentBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Sau khi {type === 'deposit' ? 'nạp' : 'rút'}</span>
            <span className={`font-extrabold ${preview >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {formatVND(preview)}
            </span>
          </div>
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-gradient-to-r from-amber-400 to-red-500 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50">
        {saving ? 'Đang lưu...' : `Xác nhận ${type === 'deposit' ? 'nạp' : 'rút'} quỹ`}
      </button>
    </BottomSheet>
  )
}
