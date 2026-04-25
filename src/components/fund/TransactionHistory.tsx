import { formatVND, formatDate } from '@/src/lib/utils'
import type { FundTransaction, Member } from '@/src/types'

interface Props { transactions: FundTransaction[]; members: Member[] }

export function TransactionHistory({ transactions, members }: Props) {
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <p className="text-xs text-amber-700 font-bold uppercase mb-2">Lịch sử giao dịch</p>
      {transactions.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">Chưa có giao dịch</p>
      ) : (
        <div className="space-y-2">
          {transactions.map(t => {
            const member = members.find(m => m.id === t.userId)
            return (
              <div key={t.id} className="flex justify-between items-center border-b border-dashed border-amber-100 pb-2 last:border-0">
                <div>
                  <p className="text-sm font-semibold">
                    {t.note || (t.type === 'deposit' ? 'Nạp quỹ' : 'Rút quỹ')}
                  </p>
                  <p className="text-xs text-gray-400">
                    {member?.displayName ?? '?'} · {t.createdAt ? formatDate(t.createdAt) : ''}
                  </p>
                </div>
                <span className={`font-bold text-sm ${t.type === 'deposit' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'deposit' ? '+' : '−'}{formatVND(t.amount)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
