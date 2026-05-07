'use client'
import { useState } from 'react'
import { addDoc, updateDoc, serverTimestamp, writeBatch, doc as fsDoc, increment } from 'firebase/firestore'
import { db } from '@/src/lib/firebase/config'
import { expensesCol, fundDoc, fundTxCol, billDoc } from '@/src/lib/firebase/collections'
import { BottomSheet } from '@/src/components/ui/BottomSheet'
import { Avatar } from '@/src/components/ui/Avatar'
import { ImageUpload } from '@/src/components/ui/ImageUpload'
import { formatVND, formatAmountInput, parseAmountInput } from '@/src/lib/utils'
import { computeAllSettled, EXPENSE_CATEGORIES } from '@/src/lib/expense'
import { logActivity } from '@/src/lib/activity'
import type { Member, ExpenseCategory, Bill } from '@/src/types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  roomId: string
  members: Member[]
  currentUserId: string
  fundBalance: number
  bills?: Bill[]
}

export function AddExpenseSheet({ open, onClose, roomId, members, currentUserId, fundBalance, bills }: Props) {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [participants, setParticipants] = useState<string[]>(members.map(m => m.id))
  const [shareOverrides, setShareOverrides] = useState<Record<string, number>>({})
  const [category, setCategory] = useState<ExpenseCategory>('other')
  const [useFund, setUseFund] = useState(false)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const amountNum = parseAmountInput(amount)
  const equalShare = participants.length > 0 ? Math.round(amountNum / participants.length) : 0
  const isCustom = Object.keys(shareOverrides).length > 0
  const getDisplayShare = (uid: string) => shareOverrides[uid] ?? equalShare
  const sharesSum = participants.reduce((s, uid) => s + getDisplayShare(uid), 0)
  const sharesValid = participants.length === 0 || Math.abs(sharesSum - amountNum) <= participants.length

  function toggleParticipant(uid: string) {
    if (participants.includes(uid)) {
      setParticipants(prev => prev.filter(id => id !== uid))
      setShareOverrides(prev => {
        if (!(uid in prev)) return prev
        const next = { ...prev }
        delete next[uid]
        return next
      })
    } else {
      setParticipants(prev => [...prev, uid])
      if (isCustom) {
        // Đang trong custom mode → set tạm equalShare, user chỉnh tay
        setShareOverrides(prev => ({ ...prev, [uid]: equalShare }))
      }
    }
  }

  function handleShareChange(uid: string, raw: string) {
    const num = parseAmountInput(raw)
    setShareOverrides(prev => {
      if (Object.keys(prev).length === 0) {
        // Lần đầu chỉnh → lock in tất cả current equal share để các ô khác không nhảy
        const all: Record<string, number> = {}
        for (const p of participants) all[p] = p === uid ? num : equalShare
        return all
      }
      return { ...prev, [uid]: num }
    })
  }

  function resetShares() {
    setShareOverrides({})
  }

  function handleSelectBill(bill: Bill) {
    if (selectedBillId === bill.id) {
      setSelectedBillId(null)
      return
    }
    setSelectedBillId(bill.id)
    if (!title.trim()) setTitle(bill.title)
    setAmount(formatAmountInput(String(bill.amount)))
  }

  function handleClose() {
    setTitle(''); setAmount(''); setUseFund(false); setImageUrls([]); setSelectedBillId(null); setNote('')
    setParticipants(members.map(m => m.id))
    setShareOverrides({})
    setPaidBy(currentUserId)
    setCategory('other')
    onClose()
  }

  async function handleSave() {
    if (!title.trim() || amountNum <= 0) { toast.error('Nhập đủ thông tin'); return }
    if (useFund && amountNum > fundBalance) { toast.error(`Quỹ không đủ (còn ${formatVND(fundBalance)})`); return }
    if (!useFund && participants.length === 0) { toast.error('Chọn ít nhất 1 người'); return }
    if (!useFund && isCustom && !sharesValid) {
      toast.error(`Tổng share ${formatVND(sharesSum)} chưa khớp ${formatVND(amountNum)}`); return
    }

    setSaving(true)
    try {
      const settlements = Object.fromEntries(
        members.map(m => [m.id, {
          paid: !participants.includes(m.id) || (m.id === paidBy && !useFund),
          paidAt: null,
        }])
      )
      const finalParticipants = useFund ? [] : participants
      const allSettled = useFund ? true : computeAllSettled(finalParticipants, settlements)

      const sharesObject = !useFund && isCustom
        ? Object.fromEntries(participants.map(uid => [uid, getDisplayShare(uid)]))
        : null

      const expenseRef = await addDoc(expensesCol(roomId), {
        title: title.trim(),
        amount: amountNum,
        paidBy,
        participants: finalParticipants,
        category,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        paidFromFund: useFund,
        settlements,
        allSettled,
        ...(sharesObject ? { shares: sharesObject } : {}),
        ...(imageUrls.length > 0 ? { imageUrls } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      })

      const payerName = members.find(m => m.id === paidBy)?.displayName ?? '?'
      await logActivity(roomId, {
        type: 'expense.created',
        actorId: currentUserId,
        title: useFund ? `💰 Chi từ quỹ: ${title.trim()}` : `💸 Chi tiêu mới: ${title.trim()}`,
        body: `${payerName} chi ${formatVND(amountNum)}${useFund ? ' (từ quỹ)' : ''}`,
        meta: { expenseId: expenseRef.id, amount: amountNum },
      })

      if (useFund) {
        const batch = writeBatch(db)
        const newFundTxRef = fsDoc(fundTxCol(roomId))
        batch.set(fundDoc(roomId), { balance: increment(-amountNum) }, { merge: true })
        batch.set(newFundTxRef, {
          type: 'withdraw', amount: amountNum, userId: currentUserId,
          note: title.trim(),
          // Đánh dấu đây là chi tiêu từ quỹ (không phải rút cá nhân)
          // → ContributionList sẽ bỏ qua, không tính vào đóng góp âm
          relatedExpenseId: expenseRef.id,
          createdAt: serverTimestamp(),
        })
        await batch.commit()
      }

      if (selectedBillId) {
        const bill = bills?.find(b => b.id === selectedBillId)
        await updateDoc(billDoc(roomId, selectedBillId), {
          paid: true,
          paidAt: serverTimestamp(),
          paidBy: currentUserId,
          amount: bill?.amount ?? amountNum,
        })
        await logActivity(roomId, {
          type: 'bill.paid',
          actorId: currentUserId,
          title: `✅ Đã đóng hóa đơn: ${bill?.title ?? ''}`,
          body: formatVND(bill?.amount ?? amountNum),
          meta: { billId: selectedBillId, amount: bill?.amount ?? amountNum },
        })
      }

      toast.success('Đã lưu chi tiêu!')
      handleClose()
    } catch {
      toast.error('Có lỗi xảy ra, thử lại')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="➕ Thêm chi tiêu">

      <label className="text-xs text-amber-700 font-semibold">MÔ TẢ</label>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Đồ ăn tối, tiền điện..."
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3" />

      <label className="text-xs text-amber-700 font-semibold">SỐ TIỀN (₫)</label>
      <input value={amount} onChange={e => setAmount(formatAmountInput(e.target.value))} placeholder="90.000" inputMode="numeric"
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3 font-bold text-red-500" />

      <label className="text-xs text-amber-700 font-semibold">LOẠI</label>
      <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)}
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3">
        {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>

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
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-amber-700 font-semibold">CHIA CHO AI?</label>
            {isCustom && (
              <button onClick={resetShares}
                className="text-[10px] text-amber-600 underline">↺ Chia đều lại</button>
            )}
          </div>
          <div className="bg-yellow-50 border-2 border-amber-200 rounded-xl p-2 mb-3 space-y-1">
            {members.map((m, i) => {
              const checked = participants.includes(m.id)
              return (
                <div key={m.id} className="flex items-center gap-2 p-1">
                  <button onClick={() => toggleParticipant(m.id)}
                    className="flex items-center gap-2 flex-1 text-left">
                    <div className={`w-4 h-4 rounded flex items-center justify-center border-2 text-xs ${checked ? 'bg-amber-400 border-amber-400 text-white' : 'border-amber-300'}`}>
                      {checked ? '✓' : ''}
                    </div>
                    <Avatar name={m.displayName} index={i} />
                    <span className="text-sm flex-1">{m.displayName}</span>
                  </button>
                  {checked && (
                    <input
                      value={formatAmountInput(String(getDisplayShare(m.id)))}
                      onChange={e => handleShareChange(m.id, e.target.value)}
                      inputMode="numeric"
                      className="w-24 text-right text-xs font-semibold text-amber-700 bg-white border-2 border-amber-200 rounded-lg px-2 py-1"
                    />
                  )}
                </div>
              )
            })}
            {participants.length > 0 && (
              <div className={`flex justify-between items-center pt-2 mt-1 border-t border-amber-200 text-xs font-bold ${sharesValid ? 'text-amber-700' : 'text-red-500'}`}>
                <span>Tổng {isCustom ? '(tùy chỉnh)' : '(chia đều)'}</span>
                <span>{formatVND(sharesSum)} / {formatVND(amountNum)}{!sharesValid && ' ⚠'}</span>
              </div>
            )}
          </div>
        </>
      )}

      {bills && bills.filter(b => b.paid !== true).length > 0 && (
        <>
          <label className="text-xs text-amber-700 font-semibold mb-2 block">GẮN VỚI HÓA ĐƠN (tuỳ chọn)</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {bills.filter(b => b.paid !== true).map(b => (
              <button key={b.id} onClick={() => handleSelectBill(b)}
                className={`text-xs px-3 py-1.5 rounded-xl border-2 font-semibold transition-colors ${
                  selectedBillId === b.id
                    ? 'bg-amber-100 border-amber-400 text-amber-800'
                    : 'border-gray-200 text-gray-500 bg-white'
                }`}>
                {b.title} · {formatVND(b.amount)}
              </button>
            ))}
          </div>
        </>
      )}

      <label className="text-xs text-amber-700 font-semibold">GHI CHÚ (tuỳ chọn)</label>
      <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú thêm..."
        rows={2}
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3 resize-none" />

      <label className="text-xs text-amber-700 font-semibold mb-2 block">ẢNH ĐÍNH KÈM (tuỳ chọn)</label>
      <div className="mb-3">
        <ImageUpload value={imageUrls} onChange={setImageUrls} max={5} />
      </div>

      <button onClick={handleSave} disabled={saving}
        className="w-full bg-gradient-to-r from-amber-400 to-red-500 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50">
        {saving ? 'Đang lưu...' : 'Lưu chi tiêu'}
      </button>
    </BottomSheet>
  )
}
