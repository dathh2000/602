'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRoom } from '@/src/hooks/useRoom'
import { useExpenses } from '@/src/hooks/useExpenses'
import { useBills } from '@/src/hooks/useBills'
import { useDebts } from '@/src/hooks/useDebts'
import { useFund } from '@/src/hooks/useFund'
import { useAuth } from '@/src/hooks/useAuth'
import { AddExpenseSheet } from '@/src/components/expense/AddExpenseSheet'
import { ExpenseDetailSheet } from '@/src/components/expense/ExpenseDetailSheet'
import { ExpenseCard } from '@/src/components/expense/ExpenseCard'
import { FAB } from '@/src/components/layout/FAB'
import { Tag } from '@/src/components/ui/Tag'
import { LoadingScreen } from '@/src/components/ui/LoadingScreen'
import { formatVND, daysUntilDue, currentYearMonth } from '@/src/lib/utils'

export default function DashboardPage() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const { room, members, loading } = useRoom()
  const expenses = useExpenses(room?.id)
  const bills = useBills(room?.id)
  const debts = useDebts(expenses, members)
  const { fund } = useFund(room?.id)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<typeof expenses[0] | null>(null)

  if (loading) return <LoadingScreen />

  if (!room) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
      <div className="text-5xl">🏠</div>
      <p className="text-amber-800 font-bold text-lg">Bạn chưa có phòng</p>
      <button onClick={() => router.push('/room/create')}
        className="bg-gradient-to-r from-amber-400 to-red-500 text-white px-6 py-3 rounded-xl font-bold w-full max-w-sm">
        Tạo phòng mới
      </button>
      <button onClick={() => router.push('/room/join')}
        className="text-amber-600 underline text-sm">
        Nhập mã mời
      </button>
      <button onClick={() => signOut().then(() => window.location.href = '/login')}
        className="text-gray-400 text-xs underline mt-2">
        Đăng xuất
      </button>
    </div>
  )

  const myDebts = debts.filter(d => d.from === user?.uid)
  const owedToMe = debts.filter(d => d.to === user?.uid)
  const myOwed = myDebts.reduce((s, d) => s + d.amount, 0)
  const owedMe = owedToMe.reduce((s, d) => s + d.amount, 0)
  const upcomingBills = bills
    .filter(b => daysUntilDue(b.dueDay) <= 7 && b.lastPaidMonth !== currentYearMonth())
    .sort((a, b) => daysUntilDue(a.dueDay) - daysUntilDue(b.dueDay))

  return (
    <main className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-amber-400 to-red-500 rounded-2xl p-4 text-white flex justify-between items-center">
        <div>
          <p className="text-xs opacity-80">🏠 {room.name}</p>
          <p className="font-bold text-lg">{members.length} thành viên</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <p className="text-xs opacity-80">Mã mời: <span className="font-bold tracking-widest">{room.inviteCode}</span></p>
          <button onClick={() => signOut().then(() => window.location.href = '/login')}
            className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-lg">
            Đăng xuất
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-amber-700">Bạn nợ</p>
          <p className="text-red-500 font-extrabold text-lg">{formatVND(myOwed)}</p>
          {myDebts.length > 0 && <Tag label={`${myDebts.length} khoản`} variant="red" />}
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-amber-700">Nợ bạn</p>
          <p className="text-green-600 font-extrabold text-lg">{formatVND(owedMe)}</p>
          {owedToMe.length > 0 && <Tag label={`${owedToMe.length} khoản`} variant="green" />}
        </div>
      </div>

      {upcomingBills.length > 0 && (
        <div>
          <p className="text-xs text-amber-700 font-bold uppercase mb-2">⏰ Sắp đến hạn</p>
          <div className="space-y-2">
            {upcomingBills.map(b => (
              <div key={b.id} className="bg-white rounded-xl p-3 shadow-sm flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">{b.title}</p>
                  <p className="text-xs text-gray-400">{daysUntilDue(b.dueDay)} ngày nữa</p>
                </div>
                <Tag label={formatVND(b.amount)} variant={daysUntilDue(b.dueDay) <= 3 ? 'red' : 'yellow'} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-xs text-amber-700 font-bold uppercase mb-2">Chi tiêu gần đây</p>
        <div className="space-y-2">
          {expenses.map(e => (
            <ExpenseCard key={e.id} expense={e} members={members} onClick={() => setSelectedExpense(e)} />
          ))}
          {expenses.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">Chưa có chi tiêu nào · Nhấn + để thêm</p>
          )}
        </div>
      </div>

      <FAB onClick={() => setSheetOpen(true)} />
      {room && user && (
        <AddExpenseSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          roomId={room.id}
          members={members}
          currentUserId={user.uid}
          fundBalance={fund.balance}
          bills={bills}
        />
      )}
      {room && user && selectedExpense && (
        <ExpenseDetailSheet
          open={true}
          onClose={() => setSelectedExpense(null)}
          expense={selectedExpense}
          members={members}
          roomId={room.id}
          currentUserId={user.uid}
        />
      )}
    </main>
  )
}
