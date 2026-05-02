'use client'
import { useState } from 'react'
import { updateDoc, serverTimestamp } from 'firebase/firestore'
import { billDoc } from '@/src/lib/firebase/collections'
import { formatVND, formatAmountInput, parseAmountInput } from '@/src/lib/utils'
import { logActivity } from '@/src/lib/activity'
import { useRoom } from '@/src/hooks/useRoom'
import { useBills } from '@/src/hooks/useBills'
import { useAuth } from '@/src/hooks/useAuth'
import { BillCard } from '@/src/components/bill/BillCard'
import { AddBillSheet } from '@/src/components/bill/AddBillSheet'
import { BillDetailSheet } from '@/src/components/bill/BillDetailSheet'
import { ImageUpload } from '@/src/components/ui/ImageUpload'
import { FAB } from '@/src/components/layout/FAB'
import { LoadingScreen } from '@/src/components/ui/LoadingScreen'
import { InfiniteScrollSentinel } from '@/src/components/ui/InfiniteScrollSentinel'
import type { Bill } from '@/src/types'
import toast from 'react-hot-toast'

export default function BillsPage() {
  const { user } = useAuth()
  const { room, loading } = useRoom()
  const { bills, hasMore: hasMoreBills, loadMore: loadMoreBills } = useBills(room?.id, 20)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingBills, setPendingBills] = useState<Set<string>>(new Set())
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
  const [payingBill, setPayingBill] = useState<Bill | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payImageUrl, setPayImageUrl] = useState<string | null>(null)

  if (loading) return <LoadingScreen />

  if (!loading && !room) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
      <p className="text-amber-800 font-bold">Bạn chưa có phòng nào</p>
      <a href="/room/create" className="bg-gradient-to-r from-amber-400 to-red-500 text-white px-6 py-3 rounded-xl font-bold">Tạo phòng mới</a>
    </div>
  )

  function openPayDialog(bill: Bill) {
    setPayingBill(bill)
    setPayAmount(formatAmountInput(String(bill.amount)))
    setPayImageUrl(null)
  }

  function closePayDialog() {
    setPayingBill(null)
    setPayAmount('')
    setPayImageUrl(null)
  }

  async function confirmPay() {
    if (!room || !user || !payingBill) return
    const bill = payingBill
    const actualAmount = parseAmountInput(payAmount)
    if (actualAmount <= 0) { toast.error('Nhập số tiền'); return }

    if (pendingBills.has(bill.id)) return
    setPendingBills(prev => new Set(prev).add(bill.id))
    try {
      await updateDoc(billDoc(room.id, bill.id), {
        paid: true,
        paidAt: serverTimestamp(),
        paidBy: user.uid,
        amount: actualAmount,
        ...(payImageUrl ? { imageUrl: payImageUrl } : {}),
      })
      await logActivity(room.id, {
        type: 'bill.paid',
        actorId: user.uid,
        title: `✅ Đã đóng hóa đơn: ${bill.title}`,
        body: formatVND(actualAmount),
        meta: { billId: bill.id, amount: actualAmount },
      })
      toast.success('Đã đánh dấu đã đóng!')
      closePayDialog()
    } finally {
      setPendingBills(prev => { const s = new Set(prev); s.delete(bill.id); return s })
    }
  }

  // Sort: chưa đóng trước, đã đóng sau
  const sortedBills = [...bills].sort((a, b) => {
    const aPaid = a.paid === true ? 1 : 0
    const bPaid = b.paid === true ? 1 : 0
    if (aPaid !== bPaid) return aPaid - bPaid
    return a.dueDay - b.dueDay
  })

  return (
    <main className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-amber-400 to-red-500 rounded-2xl p-4 text-white">
        <p className="text-sm font-bold">📅 Hóa đơn</p>
        <p className="text-xs opacity-80">
          Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
        </p>
      </div>

      {sortedBills.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">
          Chưa có hóa đơn nào<br/>Nhấn + để thêm
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {sortedBills.map(b => (
              <BillCard key={b.id} bill={b}
                onMarkPaid={() => openPayDialog(b)}
                onOpen={() => setSelectedBillId(b.id)}
                isPending={pendingBills.has(b.id)} />
            ))}
          </div>
          <InfiniteScrollSentinel hasMore={hasMoreBills} onLoadMore={loadMoreBills} />
        </>
      )}

      <FAB onClick={() => setSheetOpen(true)} />
      {room && user && <AddBillSheet open={sheetOpen} onClose={() => setSheetOpen(false)} roomId={room.id} currentUserId={user.uid} />}
      {room && selectedBillId && (() => {
        const bill = bills.find(b => b.id === selectedBillId)
        if (!bill) return null
        return (
          <BillDetailSheet open={true} onClose={() => setSelectedBillId(null)}
            bill={bill} roomId={room.id} />
        )
      })()}

      {/* Pay dialog: amount + ảnh */}
      {payingBill && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          onClick={closePayDialog}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <p className="text-base font-extrabold text-gray-800 mb-1 text-center">
              Đánh dấu đã đóng?
            </p>
            <p className="text-xs text-gray-500 text-center mb-4">
              <span className="font-semibold text-gray-700">{payingBill.title}</span>
            </p>

            <label className="text-xs text-amber-700 font-semibold">SỐ TIỀN THỰC TẾ (₫)</label>
            <input value={payAmount}
              onChange={e => setPayAmount(formatAmountInput(e.target.value))}
              inputMode="numeric"
              className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-3 font-bold text-red-500" />

            <label className="text-xs text-amber-700 font-semibold mb-2 block">
              ẢNH HÓA ĐƠN (tuỳ chọn)
            </label>
            <div className="mb-4">
              <ImageUpload key={payingBill.id}
                initialUrl={payingBill.imageUrl ?? null}
                onUploaded={setPayImageUrl} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={closePayDialog}
                className="py-2 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-500">
                Huỷ
              </button>
              <button disabled={pendingBills.has(payingBill.id)}
                onClick={confirmPay}
                className="py-2 rounded-xl bg-gradient-to-r from-amber-400 to-red-500 text-white text-sm font-bold disabled:opacity-50">
                {pendingBills.has(payingBill.id) ? '⏳ Đang lưu...' : '✓ Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
