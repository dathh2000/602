import { Avatar } from '@/src/components/ui/Avatar'
import { Tag } from '@/src/components/ui/Tag'
import { formatVND, formatDate } from '@/src/lib/utils'
import { hasCustomShares } from '@/src/lib/expense'
import type { Expense, Member } from '@/src/types'

interface Props { expense: Expense; members: Member[]; onClick?: () => void }

export function ExpenseCard({ expense, members, onClick }: Props) {
  const payer = members.find(m => m.id === expense.paidBy)
  const payerIndex = members.findIndex(m => m.id === expense.paidBy)
  const allSettled = expense.participants.every(p => expense.settlements[p]?.paid)

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl p-3 shadow-sm border-l-4 border-amber-400 flex justify-between items-start active:bg-amber-50 transition-colors"
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <Avatar name={payer?.displayName ?? '?'} index={payerIndex} size="sm" />
        <div className="min-w-0">
          <p className="font-bold text-sm text-gray-800 truncate">{expense.title}</p>
          <p className="text-xs text-gray-400">{payer?.displayName ?? '?'} · {expense.date ? formatDate(expense.date) : ''}</p>
          <div className="mt-1">
            {expense.paidFromFund
              ? <Tag label="💰 Từ quỹ" variant="green" />
              : allSettled
                ? <Tag label="✓ xong" variant="green" />
                : <Tag label="chưa trả" variant="red" />
            }
          </div>
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <p className="font-bold text-sm text-red-500">{formatVND(expense.amount)}</p>
        {!expense.paidFromFund && expense.participants.length > 0 && (
          hasCustomShares(expense)
            ? <p className="text-xs text-gray-400">tùy chỉnh</p>
            : <p className="text-xs text-gray-400">{formatVND(expense.amount / expense.participants.length)}/người</p>
        )}
        {onClick && <p className="text-[10px] text-gray-300 mt-1">chi tiết ›</p>}
      </div>
    </button>
  )
}
