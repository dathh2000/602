import { Avatar } from '@/src/components/ui/Avatar'
import { formatVND } from '@/src/lib/utils'
import type { Member, FundTransaction } from '@/src/types'

interface Props { members: Member[]; transactions: FundTransaction[] }

export function ContributionList({ members, transactions }: Props) {
  const contribs = members.map((m, i) => {
    // Chỉ tính giao dịch cá nhân (relatedExpenseId rỗng).
    // Bỏ qua withdraw từ chi tiêu nhóm (Dùng quỹ) — đó là tiền nhóm tiêu, không phải user rút cho mình.
    const total = transactions
      .filter(t => t.userId === m.id && !t.relatedExpenseId)
      .reduce((s, t) => s + (t.type === 'deposit' ? t.amount : -t.amount), 0)
    return { member: m, index: i, total }
  })

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <p className="text-xs text-amber-700 font-bold uppercase mb-2">Đóng góp từng người</p>
      {contribs.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-2">Chưa có đóng góp</p>
      ) : (
        <div className="space-y-2">
          {contribs.map(({ member, index, total }) => (
            <div key={member.id} className="flex items-center gap-2">
              <Avatar name={member.displayName} index={index} size="md" />
              <span className="text-sm font-semibold flex-1">{member.displayName}</span>
              <span className={`font-bold text-sm ${total > 0 ? 'text-green-600' : total < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {total > 0 ? `+${formatVND(total)}` : total < 0 ? `−${formatVND(-total)}` : '0₫'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
