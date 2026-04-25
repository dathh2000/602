import { formatVND } from '@/src/lib/utils'

interface Props { balance: number; isAdmin: boolean; onDeposit: () => void; onWithdraw: () => void }

export function FundBalance({ balance, isAdmin, onDeposit, onWithdraw }: Props) {
  return (
    <div className="bg-gradient-to-r from-amber-400 to-red-500 rounded-2xl p-5 text-white text-center shadow-lg shadow-amber-300/40">
      <p className="text-xs opacity-80 mb-1">SỐ DƯ QUỸ NHÓM</p>
      <p className="text-3xl font-extrabold">{formatVND(balance)}</p>
      {isAdmin ? (
        <div className="flex gap-3 justify-center mt-4">
          <button onClick={onDeposit} className="bg-white/25 rounded-xl px-4 py-2 text-xs font-bold">+ Nạp quỹ</button>
          <button onClick={onWithdraw} className="bg-white/25 rounded-xl px-4 py-2 text-xs font-bold">− Rút quỹ</button>
        </div>
      ) : (
        <p className="text-xs opacity-70 mt-3">Chỉ admin mới có thể nạp/rút quỹ</p>
      )}
    </div>
  )
}
