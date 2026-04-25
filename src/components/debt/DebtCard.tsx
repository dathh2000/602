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

  const relatedExpenses = expenses.filter(e =>
    !e.paidFromFund &&
    e.participants.includes(debt.from) &&
    e.paidBy === debt.to &&
    !e.settlements[debt.from]?.paid
  )

  async function handleSettle() {
    setSettling(true)
    try {
      await Promise.all(relatedExpenses.map(e =>
        updateDoc(doc(expensesCol(roomId), e.id), {
          [`settlements.${debt.from}.paid`]: true,
          [`settlements.${debt.from}.paidAt`]: serverTimestamp(),
        })
      ))
      toast.success('Đã đánh dấu thanh toán!')
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setSettling(false)
    }
  }

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <Avatar name={fromMember?.displayName ?? '?'} index={fromIndex} size="md" />
        <span className="text-xs text-gray-400 flex-1 text-center">→ nợ →</span>
        <Avatar name={toMember?.displayName ?? '?'}  index={toIndex}   size="md" />
        {relatedExpenses.length > 0 && (
          <button onClick={handleSettle} disabled={settling}
            className="ml-auto bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg disabled:opacity-50">
            {settling ? '...' : '✓ Đã trả'}
          </button>
        )}
      </div>
      <div className="flex justify-between items-center">
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400 underline">
          {relatedExpenses.length} khoản {expanded ? '▲' : '▼'}
        </button>
        <p className="font-extrabold text-red-500">{formatVND(debt.amount)}</p>
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
