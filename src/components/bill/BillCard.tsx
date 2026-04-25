import { Tag } from '@/src/components/ui/Tag'
import { formatVND, daysUntilDue } from '@/src/lib/utils'
import type { Bill } from '@/src/types'

const BILL_ICONS: Record<string, string> = {
  rent: '🏠', electric: '💡', water: '🚰', internet: '📶', other: '📌'
}

interface Props { bill: Bill; onMarkPaid: () => void }

export function BillCard({ bill, onMarkPaid }: Props) {
  const days = daysUntilDue(bill.dueDay)
  const urgent = days <= 3
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
      <span className="text-2xl">{BILL_ICONS[bill.category] ?? '📌'}</span>
      <div className="flex-1">
        <p className="font-bold text-sm text-gray-800">{bill.title}</p>
        <p className="text-xs text-gray-400">
          Hạn ngày {bill.dueDay} ·{' '}
          <span className="text-blue-500 text-[10px] font-bold bg-blue-100 px-1 rounded">ZALO</span>
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold text-sm">{formatVND(bill.amount)}</p>
        <Tag label={urgent ? `⏰ ${days} ngày` : `${days} ngày`} variant={urgent ? 'red' : 'yellow'} />
      </div>
      <button onClick={onMarkPaid}
        className="ml-1 bg-green-100 text-green-700 text-xs font-bold px-2 py-2 rounded-lg">✓</button>
    </div>
  )
}
