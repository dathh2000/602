'use client'
import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { expensesCol } from '@/src/lib/firebase/collections'
import { Avatar } from '@/src/components/ui/Avatar'
import { formatVND } from '@/src/lib/utils'
import type { DebtEdge, Member, Expense } from '@/src/types'
import toast from 'react-hot-toast'

interface Props {
  debt: DebtEdge
  members: Member[]
  expenses: Expense[]
  roomId: string
}

export function DebtCard({ debt, members, expenses, roomId }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [settling, setSettling] = useState(false)

  const fromMember = members.find(m => m.id === debt.from)
  const toMember   = members.find(m => m.id === debt.to)
  const fromIndex  = members.findIndex(m => m.id === debt.from)
  const toIndex    = members.findIndex(m => m.id === debt.to)

  // Expenses đóng góp vào khoản nợ này (from nợ to)
  const relatedExpenses = expenses.filter(e =>
    !e.paidFromFund &&
    e.participants.includes(debt.from) &&
    e.paidBy === debt.to &&
    !e.settlements[debt.from]?.paid
  )

  async function handleSettle() {
    setSettling(true)
    try {
      const updates: Promise<void>[] = []

      for (const e of expenses) {
        if (e.paidFromFund) continue
        // from nợ to: mark from đã trả
        if (e.paidBy === debt.to && e.participants.includes(debt.from) && !e.settlements[debt.from]?.paid) {
          updates.push(updateDoc(doc(expensesCol(roomId), e.id), {
            [`settlements.${debt.from}.paid`]: true,
            [`settlements.${debt.from}.paidAt`]: serverTimestamp(),
          }))
        }
        // to nợ from (ngược chiều, đã được net): mark to đã trả luôn
        if (e.paidBy === debt.from && e.participants.includes(debt.to) && !e.settlements[debt.to]?.paid) {
          updates.push(updateDoc(doc(expensesCol(roomId), e.id), {
            [`settlements.${debt.to}.paid`]: true,
            [`settlements.${debt.to}.paidAt`]: serverTimestamp(),
          }))
        }
      }

      await Promise.all(updates)
      toast.success('Đã đánh dấu thanh toán!')
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setSettling(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-1 mb-2">
        <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
          <Avatar name={fromMember?.displayName ?? '?'} index={fromIndex} size="md" />
          <span className="text-xs font-semibold text-gray-700 text-center w-full break-words leading-tight mt-0.5">
            {fromMember?.displayName ?? '?'}
          </span>
        </div>
        <span className="text-xs text-gray-400 shrink-0 px-1">→ nợ →</span>
        <div className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
          <Avatar name={toMember?.displayName ?? '?'} index={toIndex} size="md" />
          <span className="text-xs font-semibold text-gray-700 text-center w-full break-words leading-tight mt-0.5">
            {toMember?.displayName ?? '?'}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400 underline">
          {relatedExpenses.length} khoản {expanded ? '▲' : '▼'}
        </button>
        <div className="flex items-center gap-2">
          {relatedExpenses.length > 0 && (
            <button onClick={handleSettle} disabled={settling}
              className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg disabled:opacity-50">
              {settling ? '...' : '✓ Đã trả'}
            </button>
          )}
          <p className="font-extrabold text-red-500">{formatVND(debt.amount)}</p>
        </div>
      </div>

      {expanded && relatedExpenses.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-dashed border-amber-200 pt-2">
          {relatedExpenses.map(e => (
            <div key={e.id} className="flex justify-between text-xs text-gray-500">
              <span>{e.title}</span>
              <span className="text-red-400">{formatVND(e.amount / (e.participants.length || 1))}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
