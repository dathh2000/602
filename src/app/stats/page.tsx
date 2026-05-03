'use client'
import { useMemo, useState } from 'react'
import { useRoom } from '@/src/hooks/useRoom'
import { useExpenses } from '@/src/hooks/useExpenses'
import { useBills } from '@/src/hooks/useBills'
import { useFund } from '@/src/hooks/useFund'
import { LoadingScreen } from '@/src/components/ui/LoadingScreen'
import { Avatar } from '@/src/components/ui/Avatar'
import { formatVND, formatVNDShort, formatDate } from '@/src/lib/utils'
import { EXPENSE_CATEGORIES } from '@/src/lib/expense'

type Range = 'month' | 'all'

const CATEGORY_LABEL = Object.fromEntries(EXPENSE_CATEGORIES.map(c => [c.value, c.label]))

function ymKey(date: Date | { toDate?: () => Date } | undefined | null): string {
  if (!date) return ''
  const d = date instanceof Date ? date : (typeof date.toDate === 'function' ? date.toDate() : null)
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function asDate(date: Date | { toDate?: () => Date } | undefined | null): Date | null {
  if (!date) return null
  if (date instanceof Date) return date
  if (typeof date.toDate === 'function') return date.toDate()
  return null
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

  // #2 So sánh tháng này vs tháng trước
  const monthComparison = useMemo(() => {
    const now = new Date()
    const thisYM = ymKey(now)
    const prevYM = ymKey(new Date(now.getFullYear(), now.getMonth() - 1, 1))
    let thisAmt = 0, prevAmt = 0
    for (const e of expenses) {
      const k = ymKey(e.createdAt ?? null)
      if (k === thisYM) thisAmt += e.amount
      else if (k === prevYM) prevAmt += e.amount
    }
    const delta = thisAmt - prevAmt
    const pct = prevAmt > 0 ? (delta / prevAmt) * 100 : 0
    return { thisAmt, prevAmt, delta, pct, prevYM }
  }, [expenses])

  // #4 Trung bình ngày + dự đoán cho tháng hiện tại
  const monthPace = useMemo(() => {
    if (range !== 'month') return null
    const now = new Date()
    const daysPassed = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const avgPerDay = daysPassed > 0 ? total / daysPassed : 0
    const projected = avgPerDay * daysInMonth
    return { avgPerDay, projected, daysPassed, daysInMonth }
  }, [range, total])

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

  // #1 Top 5 chi tiêu lớn nhất
  const top5 = useMemo(() => {
    return [...filteredExpenses]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }, [filteredExpenses])

  // #3 Phân bố theo ngày trong tuần (T2-CN)
  const byWeekday = useMemo(() => {
    const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    const dayIdx = [1, 2, 3, 4, 5, 6, 0] // map: position → JS getDay()
    const map: Record<number, number> = {}
    for (const e of filteredExpenses) {
      const d = asDate(e.createdAt ?? null)
      if (!d) continue
      const day = d.getDay()
      map[day] = (map[day] ?? 0) + e.amount
    }
    const data = dayIdx.map((di, i) => ({ label: labels[i], amt: map[di] ?? 0 }))
    const max = Math.max(...data.map(d => d.amt), 1)
    return data.map(d => ({ ...d, pct: (d.amt / max) * 100 }))
  }, [filteredExpenses])

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

  // #5 Lịch sử quỹ 6 tháng (deposit - personal withdraw, bỏ qua tx liên quan expense)
  const fundByMonth = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of transactions) {
      if (t.relatedExpenseId) continue // bỏ qua chi từ quỹ (đó là tiền nhóm tiêu)
      const k = ymKey(t.createdAt ?? null)
      if (!k) continue
      const delta = t.type === 'deposit' ? t.amount : -t.amount
      map[k] = (map[k] ?? 0) + delta
    }
    const months: string[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(ymKey(d))
    }
    const series = months.map(m => ({ month: m, amt: map[m] ?? 0 }))
    const maxAbs = Math.max(...series.map(s => Math.abs(s.amt)), 1)
    return series.map(s => ({ ...s, pct: (Math.abs(s.amt) / maxAbs) * 100 }))
  }, [transactions])

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

      {/* #2 So sánh tháng này vs trước */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-amber-700 font-bold uppercase mb-3">So với tháng trước</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase">Tháng này</p>
            <p className="font-extrabold text-base text-red-500">{formatVNDShort(monthComparison.thisAmt)}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase">{`Tháng trước (${monthComparison.prevYM.slice(5)})`}</p>
            <p className="font-extrabold text-base text-gray-600">{formatVNDShort(monthComparison.prevAmt)}</p>
          </div>
        </div>
        {monthComparison.prevAmt > 0 ? (
          <div className={`text-center rounded-xl p-2 text-sm font-bold ${
            monthComparison.delta > 0 ? 'bg-red-50 text-red-600' : monthComparison.delta < 0 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'
          }`}>
            {monthComparison.delta > 0 ? '↑' : monthComparison.delta < 0 ? '↓' : '='}{' '}
            {Math.abs(monthComparison.pct).toFixed(0)}%
            {' · '}
            {monthComparison.delta > 0 ? '+' : ''}{formatVNDShort(monthComparison.delta)}
          </div>
        ) : (
          <p className="text-center text-xs text-gray-400">Chưa có dữ liệu tháng trước</p>
        )}
      </div>

      {/* #4 Trung bình ngày + dự đoán (chỉ show trong 'month') */}
      {monthPace && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-amber-700 font-bold uppercase mb-3">Pace tháng này</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Đã qua</span>
              <span className="font-semibold">{monthPace.daysPassed}/{monthPace.daysInMonth} ngày</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Trung bình/ngày</span>
              <span className="font-extrabold text-amber-700">{formatVND(monthPace.avgPerDay)}</span>
            </div>
            <div className="flex justify-between border-t border-amber-100 pt-2">
              <span className="text-gray-500">Dự kiến cả tháng</span>
              <span className="font-extrabold text-red-500">{formatVND(monthPace.projected)}</span>
            </div>
          </div>
        </div>
      )}

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

      {/* #1 Top 5 chi tiêu lớn nhất */}
      {top5.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-amber-700 font-bold uppercase mb-3">🔝 Top 5 chi tiêu lớn nhất</p>
          <div className="space-y-2">
            {top5.map((e, idx) => {
              const payer = members.find(m => m.id === e.paidBy)
              const payerIdx = members.findIndex(m => m.id === e.paidBy)
              return (
                <div key={e.id} className="flex items-center gap-2">
                  <span className="w-5 text-center text-xs font-bold text-amber-700">{idx + 1}</span>
                  <Avatar name={payer?.displayName ?? '?'} index={payerIdx} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{e.title}</p>
                    <p className="text-[10px] text-gray-400">
                      {payer?.displayName ?? '?'} · {e.date ? formatDate(e.date) : ''}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold text-red-500 shrink-0">{formatVNDShort(e.amount)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* #3 Phân bố theo ngày trong tuần */}
      {byWeekday.some(d => d.amt > 0) && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-amber-700 font-bold uppercase mb-3">Theo ngày trong tuần</p>
          <div className="flex gap-1 items-end h-24 mb-1">
            {byWeekday.map(({ label, amt, pct }) => (
              <div key={label} className="flex-1 flex flex-col items-center justify-end">
                <span className="text-[9px] text-gray-400 mb-0.5">
                  {amt > 0 ? formatVNDShort(amt) : ''}
                </span>
                <div className="w-full bg-gradient-to-t from-amber-400 to-red-400 rounded-t"
                  style={{ height: `${Math.max(pct, amt > 0 ? 4 : 0)}%`, minHeight: amt > 0 ? '4px' : '0' }} />
              </div>
            ))}
          </div>
          <div className="flex gap-1">
            {byWeekday.map(({ label }) => (
              <span key={label} className="flex-1 text-[10px] text-gray-500 text-center font-semibold">
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Theo tháng (6 tháng gần) */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <p className="text-xs text-amber-700 font-bold uppercase mb-3">Chi tiêu 6 tháng gần</p>
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

      {/* #5 Lịch sử quỹ 6 tháng */}
      {fundByMonth.some(m => m.amt !== 0) && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-xs text-amber-700 font-bold uppercase mb-3">💰 Quỹ 6 tháng (nạp ròng)</p>
          <div className="space-y-2">
            {fundByMonth.map(({ month, amt, pct }) => (
              <div key={month}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-700">{month}</span>
                  <span className={`font-bold ${amt > 0 ? 'text-green-600' : amt < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {amt > 0 ? '+' : amt < 0 ? '−' : ''}{formatVNDShort(Math.abs(amt))}
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${
                    amt > 0 ? 'bg-green-400' : 'bg-red-400'
                  }`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            Tổng nạp − rút cá nhân (không tính chi tiêu từ quỹ)
          </p>
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
