'use client'
import { useMemo, useState } from 'react'
import { useRoom } from '@/src/hooks/useRoom'
import { useExpenses } from '@/src/hooks/useExpenses'
import { useBills } from '@/src/hooks/useBills'
import { useFund } from '@/src/hooks/useFund'
import { LoadingScreen } from '@/src/components/ui/LoadingScreen'
import { Avatar } from '@/src/components/ui/Avatar'
import { formatVND, formatVNDShort } from '@/src/lib/utils'
import { EXPENSE_CATEGORIES } from '@/src/lib/expense'

type Range = 'month' | 'all'

const CATEGORY_LABEL = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.value, c.label]))

function ymKey(date: Date | { toDate?: () => Date } | undefined | null): string {
  if (!date) return ''
  // Defensive: accept Date hoặc Firestore Timestamp
  const d = date instanceof Date ? date : (typeof date.toDate === 'function' ? date.toDate() : null)
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function StatsPage() {
  const { room, members, loading } = useRoom()
  const { expenses } = useExpenses(room?.id) // load all
  const { bills } = useBills(room?.id)
  const { fund, transactions } = useFund(room?.id)
  const [range, setRange] = useState<Range>('month')

  const currentYM = ymKey(new Date())

  const filteredExpenses = useMemo(() => {
    if (range === 'all') return expenses
    return expenses.filter(e => ymKey(e.createdAt ?? null) === currentYM)
  }, [expenses, range, currentYM])

  // Tổng + counts
  const total = filteredExpenses.reduce((s, e) => s + e.amount, 0)
  const totalFromFund = filteredExpenses.filter(e => e.paidFromFund).reduce((s, e) => s + e.amount, 0)
  const totalPersonal = total - totalFromFund

  // Theo loại
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of filteredExpenses) {
      map[e.category] = (map[e.category] ?? 0) + e.amount
    }
    return Object.entries(map)
      .map(([cat, amt]) => ({ cat, amt, pct: total > 0 ? (amt / total) * 100 : 0 }))
      .sort((a, b) => b.amt - a.amt)
  }, [filteredExpenses, total])

  // Theo tháng (6 tháng gần)
  const byMonth = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of expenses) {
      const k = ymKey(e.createdAt ?? null)
      if (!k) continue
      map[k] = (map[k] ?? 0) + e.amount
    }
    const months: string[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(ymKey(d))
    }
    const series = months.map(m => ({ month: m, amt: map[m] ?? 0 }))
    const max = Math.max(...series.map(s => s.amt), 1)
    return series.map(s => ({ ...s, pct: (s.amt / max) * 100 }))
  }, [expenses])

  // Theo người chi
  const byPayer = useMemo(() => {
    const map: Record<string, number> = {}
    for (const e of filteredExpenses) {
      if (e.paidFromFund) continue
      map[e.paidBy] = (map[e.paidBy] ?? 0) + e.amount
    }
    return members.map((m, i) => ({
      member: m, index: i, amt: map[m.id] ?? 0,
    })).sort((a, b) => b.amt - a.amt)
  }, [filteredExpenses, members])

  // Bill stats
  const billsPaidThisMonth = bills.filter(b => b.paid === true && ymKey(b.paidAt ?? null) === currentYM)
  const billsUnpaid = bills.filter(b => b.paid !== true)
  const billsPaidTotal = billsPaidThisMonth.reduce((s, b) => s + b.amount, 0)
  const billsUnpaidTotal = billsUnpaid.reduce((s, b) => s + b.amount, 0)

  // Fund stats
  const totalDeposits = transactions
    .filter(t => t.type === 'deposit' && !t.relatedExpenseId)
    .reduce((s, t) => s + t.amount, 0)
  const totalFundSpent = transactions
    .filter(t => t.type === 'withdraw' && t.relatedExpenseId)
    .reduce((s, t) => s + t.amount, 0)

  if (loading) return <LoadingScreen />
  if (!room) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 gap-4">
      <p className="text-amber-800 font-bold">Bạn chưa có phòng nào</p>
      <a href="/room/create" className="bg-gradient-to-r from-amber-400 to-red-500 text-white px-6 py-3 rounded-xl font-bold">Tạo phòng mới</a>
    </div>
  )

  return (
    <main className="p-4 space-y-4">
      <div className="bg-gradient-to-r from-amber-400 to-red-500 rounded-2xl p-4 text-white">
        <p className="text-sm font-bold">📊 Thống kê</p>
        <p className="text-xs opacity-80">Báo cáo chi tiêu nhóm</p>
      </div>

      {/* Range selector */}
      <div className="grid grid-cols-2 gap-1 bg-amber-100 rounded-xl p-1">
        {(['month', 'all'] as const).map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`rounded-xl py-2 text-xs font-bold ${range === r ? 'bg-gradient-to-r from-amber-400 to-red-500 text-white' : 'text-gray-500'}`}>
            {r === 'month' ? 'Tháng này' : 'Tất cả'}
          </button>
        ))}
      </div>

      {/* Tổng quan */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-amber-700 font-bold uppercase mb-3">Tổng quan</p>
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Tổng chi" value={formatVND(total)} color="text-red-500" />
          <Stat label="Số chi tiêu" value={String(filteredExpenses.length)} color="text-amber-600" />
          <Stat label="Cá nhân chi" value={formatVND(totalPersonal)} color="text-orange-500" />
          <Stat label="Từ quỹ" value={formatVND(totalFromFund)} color="text-green-600" />
        </div>
      </div>

      {/* Theo loại */}
      {byCategory.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-amber-700 font-bold uppercase mb-3">Theo loại</p>
          <div className="space-y-2">
            {byCategory.map(({ cat, amt, pct }) => (
              <Bar key={cat}
                label={CATEGORY_LABEL[cat] ?? '📌 Khác'}
                value={formatVND(amt)}
                pct={pct}
                color="bg-amber-400" />
            ))}
          </div>
        </div>
      )}

      {/* Theo tháng */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-amber-700 font-bold uppercase mb-3">6 tháng gần đây</p>
        <div className="space-y-2">
          {byMonth.map(({ month, amt, pct }) => (
            <Bar key={month}
              label={month}
              value={formatVNDShort(amt)}
              pct={pct}
              color={month === currentYM ? 'bg-red-400' : 'bg-blue-400'} />
          ))}
        </div>
      </div>

      {/* Theo người chi */}
      {byPayer.some(p => p.amt > 0) && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-amber-700 font-bold uppercase mb-3">Người chi nhiều nhất</p>
          <div className="space-y-2">
            {byPayer.filter(p => p.amt > 0).map(({ member, index, amt }) => {
              const max = byPayer[0].amt || 1
              const pct = (amt / max) * 100
              return (
                <div key={member.id} className="flex items-center gap-2">
                  <Avatar name={member.displayName} index={index} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="font-semibold truncate">{member.displayName}</span>
                      <span className="font-bold text-amber-700 shrink-0">{formatVND(amt)}</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-purple-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Hóa đơn */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-amber-700 font-bold uppercase mb-3">📅 Hóa đơn</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Stat label={`Đã đóng tháng ${new Date().getMonth() + 1}`} value={String(billsPaidThisMonth.length)} color="text-green-600" />
          <Stat label="Chưa đóng" value={String(billsUnpaid.length)} color="text-red-500" />
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Tổng đã đóng tháng này</span>
            <span className="font-semibold text-green-600">{formatVND(billsPaidTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tổng chưa đóng</span>
            <span className="font-semibold text-red-500">{formatVND(billsUnpaidTotal)}</span>
          </div>
        </div>
      </div>

      {/* Quỹ */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-amber-700 font-bold uppercase mb-3">💰 Quỹ nhóm</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <Stat label="Số dư" value={formatVND(fund.balance)} color="text-emerald-600" />
          <Stat label="Đã dùng" value={formatVND(totalFundSpent)} color="text-orange-500" />
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Tổng đã nạp (cá nhân)</span>
            <span className="font-semibold text-green-600">+{formatVND(totalDeposits)}</span>
          </div>
        </div>
      </div>
    </main>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-amber-50 rounded-xl p-2.5">
      <p className="text-[10px] text-gray-500 uppercase">{label}</p>
      <p className={`font-extrabold text-base ${color} truncate`}>{value}</p>
    </div>
  )
}

function Bar({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-700">{label}</span>
        <span className="font-bold text-gray-700">{value}</span>
      </div>
      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

