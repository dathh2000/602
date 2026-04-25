'use client'
import { useState } from 'react'
import { addDoc, serverTimestamp } from 'firebase/firestore'
import { billPaymentsCol } from '@/src/lib/firebase/collections'
import { useRoom } from '@/src/hooks/useRoom'
import { useBills } from '@/src/hooks/useBills'
import { useAuth } from '@/src/hooks/useAuth'
import { BillCard } from '@/src/components/bill/BillCard'
import { AddBillSheet } from '@/src/components/bill/AddBillSheet'
import { FAB } from '@/src/components/layout/FAB'
import { LoadingScreen } from '@/src/components/ui/LoadingScreen'
import toast from 'react-hot-toast'

export default function BillsPage() {
  const { user } = useAuth()
  const { room, loading } = useRoom()
  const bills = useBills(room?.id)
  const [sheetOpen, setSheetOpen] = useState(false)

  if (loading) return <LoadingScreen />

  async function markPaid(billId: string) {
    if (!room || !user) return
    const month = new Date().toISOString().slice(0, 7) // YYYY-MM
    try {
      await addDoc(billPaymentsCol(room.id, billId), {
        paid: true,
        paidAt: serverTimestamp(),
        paidBy: user.uid,
        month,
      })
      toast.success('Đã đánh dấu đã đóng!')
    } catch {
      toast.error('Có lỗi xảy ra')
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
            <BillCard key={b.id} bill={b} onMarkPaid={() => markPaid(b.id)} />
          ))}
        </div>
      )}

      <FAB onClick={() => setSheetOpen(true)} />
      {room && <AddBillSheet open={sheetOpen} onClose={() => setSheetOpen(false)} roomId={room.id} />}
    </main>
  )
}
