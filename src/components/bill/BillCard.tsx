import { Tag } from '@/src/components/ui/Tag'
import { formatVND, daysUntilDue } from '@/src/lib/utils'
import type { Bill } from '@/src/types'

const BILL_ICONS: Record<string, string> = {
  rent: '🏠', electric: '💡', water: '🚰', internet: '📶', other: '📌'
}

interface Props {
  bill: Bill
  onMarkPaid: () => void
  onOpen?: () => void
  isPending?: boolean
}

export function BillCard({ bill, onMarkPaid, onOpen, isPending }: Props) {
  const days = daysUntilDue(bill.dueDay)
  const urgent = days <= 3
  const isPaid = bill.paid === true

  function handleMarkPaid(e: React.MouseEvent) {
    e.stopPropagation()
    onMarkPaid()
  }

  return (
    <div onClick={onOpen}
      className={`rounded-xl p-3 shadow-sm flex items-center gap-3 cursor-pointer active:bg-amber-50 ${isPaid ? 'bg-green-50/50' : 'bg-white'}`}>
      <span className="text-2xl">{BILL_ICONS[bill.category] ?? '📌'}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm truncate ${isPaid ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{bill.title}</p>
        <p className="text-xs text-gray-400">
          Hạn ngày {bill.dueDay}
          {bill.imageUrl && <span className="ml-1 text-amber-500">📎</span>}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-bold text-sm ${isPaid ? 'text-gray-400 line-through' : ''}`}>
          {formatVND(bill.amount)}
        </p>
        {!isPaid && (
          <Tag label={urgent ? `⏰ ${days} ngày` : `${days} ngày`} variant={urgent ? 'red' : 'yellow'} />
        )}
      </div>
      {isPaid ? (
        <div className="ml-1 w-9 h-9 flex items-center justify-center rounded-lg bg-green-100 text-green-600 text-base">
          ✓
        </div>
      ) : (
        <button onClick={handleMarkPaid} disabled={isPending}
          className="ml-1 w-9 h-9 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-300 text-lg disabled:opacity-50 hover:border-green-400 hover:text-green-400 transition-colors">
          ○
        </button>
      )}
    </div>
  )
}
