import { useState } from 'react'
import { Tag } from '@/src/components/ui/Tag'
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog'
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
  isPaid?: boolean
}

export function BillCard({ bill, onMarkPaid, onOpen, isPending, isPaid }: Props) {
  const [confirming, setConfirming] = useState(false)
  const days = daysUntilDue(bill.dueDay)
  const urgent = days <= 3

  function handleMarkPaid(e: React.MouseEvent) {
    e.stopPropagation()
    setConfirming(true)
  }

  return (
    <>
      <div onClick={onOpen}
        className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3 cursor-pointer active:bg-amber-50">
        <span className="text-2xl">{BILL_ICONS[bill.category] ?? '📌'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-800 truncate">{bill.title}</p>
          <p className="text-xs text-gray-400">
            Hạn ngày {bill.dueDay} ·{' '}
            <span className="text-blue-500 text-[10px] font-bold bg-blue-100 px-1 rounded">ZALO</span>
            {bill.imageUrl && <span className="ml-1 text-amber-500">📎</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="font-bold text-sm">{formatVND(bill.amount)}</p>
          <Tag label={urgent ? `⏰ ${days} ngày` : `${days} ngày`} variant={urgent ? 'red' : 'yellow'} />
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

      <ConfirmDialog
        open={confirming}
        title="Đánh dấu đã đóng?"
        message={
          <>
            Hóa đơn <span className="font-semibold text-gray-700">{bill.title}</span>{' '}
            <span className="font-extrabold text-red-500">{formatVND(bill.amount)}</span>{' '}
            đã được đóng tháng này
          </>
        }
        loading={isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false)
          onMarkPaid()
        }}
      />
    </>
  )
}
