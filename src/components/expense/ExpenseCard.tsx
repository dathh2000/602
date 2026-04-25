import { Avatar } from '@/src/components/ui/Avatar'
import { Tag } from '@/src/components/ui/Tag'
import { formatVND, formatDate } from '@/src/lib/utils'
import type { Expense, Member } from '@/src/types'

interface Props { expense: Expense; members: Member[] }

export function ExpenseCard({ expense, members }: Props) {
  const payer = members.find(m => m.id === expense.paidBy)
  const allSettled = expense.participants.every(p => expense.settlements[p]?.paid)

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm border-l-4 border-amber-400 flex justify-between items-start">
      <div>
        <p className="font-bold text-sm text-gray-800">{expense.title}</p>
        <p className="text-xs text-gray-400">{payer?.displayName ?? '?'} chi · {expense.date ? formatDate(expense.date) : ''}</p>
        <div className="mt-1">
          {expense.paidFromFund
            ? <Tag label="💰 Từ quỹ" variant="green" />
            : allSettled
              ? <Tag label="✓ xong" variant="green" />
              : <Tag label="chưa trả" variant="red" />
          }
        </div>
      </div>
      <div className="text-right">
        <p className="font-bold text-sm text-red-500">-{formatVND(expense.amount)}</p>
        {!expense.paidFromFund && expense.participants.length > 0 && (
          <p className="text-xs text-gray-400">{formatVND(expense.amount / expense.participants.length)}/người</p>
        )}
      </div>
    </div>
  )
}
