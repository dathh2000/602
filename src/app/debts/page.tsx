'use client'
import { useRoom } from '@/src/hooks/useRoom'
import { useExpenses } from '@/src/hooks/useExpenses'
import { useExpensesUnsettled } from '@/src/hooks/useExpensesUnsettled'
import { useDebts } from '@/src/hooks/useDebts'
import { DebtCard } from '@/src/components/debt/DebtCard'
import { LoadingScreen } from '@/src/components/ui/LoadingScreen'
import { formatVND } from '@/src/lib/utils'

export default function DebtsPage() {
  const { room, members, loading } = useRoom()
  const unsettledExpenses = useExpensesUnsettled(room?.id)
  const debts = useDebts(unsettledExpenses, members)
  const { expenses: recent } = useExpenses(room?.id, 20)

  if (loading) return <LoadingScreen />

  if (!room) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
      <p className="text-amber-800 font-bold">Bạn chưa có phòng nào</p>
      <a href="/room/create" className="bg-gradient-to-r from-amber-400 to-red-500 text-white px-6 py-3 rounded-xl font-bold">Tạo phòng mới</a>
    </div>
  )

  const settled = recent.filter(e =>
    !e.paidFromFund && e.participants.length > 0 && e.allSettled === true
  ).slice(0, 5)

  return (
    <main className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-amber-400 to-red-500 rounded-2xl p-4 text-white">
        <p className="text-sm font-bold">👥 Công nợ</p>
        <p className="text-xs opacity-80">Đã tối giản hóa số giao dịch</p>
      </div>

      {debts.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">🎉 Không ai nợ ai cả!</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-amber-700 font-bold uppercase">Cần thanh toán</p>
          {debts.map(d => (
            <DebtCard key={`${d.from}-${d.to}`} debt={d} members={members} expenses={unsettledExpenses} roomId={room.id} />
          ))}
        </div>
      )}

      {settled.length > 0 && (
        <div>
          <p className="text-xs text-amber-700 font-bold uppercase mb-2">✅ Đã thanh toán gần đây</p>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1">
            {settled.map(e => (
              <p key={e.id} className="text-xs text-green-700">{e.title} · {formatVND(e.amount)}</p>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}
