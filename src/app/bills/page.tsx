'use client'
import { useState } from 'react'
import { addDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import { billPaymentsCol, billDoc } from '@/src/lib/firebase/collections'
import { currentYearMonth } from '@/src/lib/utils'
import { useRoom } from '@/src/hooks/useRoom'
import { useBills } from '@/src/hooks/useBills'
import { useAuth } from '@/src/hooks/useAuth'
import { BillCard } from '@/src/components/bill/BillCard'
import { AddBillSheet } from '@/src/components/bill/AddBillSheet'
import { BillDetailSheet } from '@/src/components/bill/BillDetailSheet'
import { FAB } from '@/src/components/layout/FAB'
import { LoadingScreen } from '@/src/components/ui/LoadingScreen'
import toast from 'react-hot-toast'

export default function BillsPage() {
  const { user } = useAuth()
  const { room, loading } = useRoom()
  const bills = useBills(room?.id)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingBills, setPendingBills] = useState<Set<string>>(new Set())
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)

  if (loading) return <LoadingScreen />

  if (!loading && !room) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
      <p className="text-amber-800 font-bold">Bạn chưa có phòng nào</p>
      <a href="/room/create" className="bg-gradient-to-r from-amber-400 to-red-500 text-white px-6 py-3 rounded-xl font-bold">Tạo phòng mới</a>
    </div>
  )

  async function markPaid(billId: string) {
    if (!room || !user) return
    if (pendingBills.has(billId)) return
    setPendingBills(prev => new Set(prev).add(billId))
    try {
      const month = format(new Date(), 'yyyy-MM')
      await Promise.all([
        addDoc(billPaymentsCol(room.id, billId), {
          paid: true, paidAt: serverTimestamp(), paidBy: user.uid, month,
        }),
        updateDoc(billDoc(room.id, billId), { lastPaidMonth: month }),
      ])
      toast.success('Đã đánh dấu đã đóng!')
    } finally {
      setPendingBills(prev => { const s = new Set(prev); s.delete(billId); return s })
    }
  }

  return (
    <main className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-amber-400 to-red-500 rounded-2xl p-4 text-white">
        <p className="text-sm font-bold">📅 Hóa đơn định kỳ</p>
        <p className="text-xs opacity-80">
          Tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}
        </p>
      </div>

      {bills.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">
          Chưa có hóa đơn nào<br/>Nhấn + để thêm
        </p>
      ) : (
        <div className="space-y-2">
          {bills.map(b => (
            <BillCard key={b.id} bill={b}
              onMarkPaid={() => markPaid(b.id)}
              onOpen={() => setSelectedBillId(b.id)}
              isPending={pendingBills.has(b.id)}
              isPaid={b.lastPaidMonth === currentYearMonth()} />
          ))}
        </div>
      )}

      <FAB onClick={() => setSheetOpen(true)} />
      {room && <AddBillSheet open={sheetOpen} onClose={() => setSheetOpen(false)} roomId={room.id} />}
      {room && selectedBillId && (() => {
        const bill = bills.find(b => b.id === selectedBillId)
        if (!bill) return null
        return (
          <BillDetailSheet open={true} onClose={() => setSelectedBillId(null)}
            bill={bill} roomId={room.id} />
        )
      })()}
    </main>
  )
}
