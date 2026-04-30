'use client'
import { useState } from 'react'
import { doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore'
import { expensesCol } from '@/src/lib/firebase/collections'
import { Avatar } from '@/src/components/ui/Avatar'
import { formatVND } from '@/src/lib/utils'
import { computeAllSettled, getShare } from '@/src/lib/expense'
import { logActivity } from '@/src/lib/activity'
import type { DebtEdge, Member, Expense, Settlement } from '@/src/types'
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
  const [confirming, setConfirming] = useState(false)

  const fromMember = members.find(m => m.id === debt.from)
  const toMember   = members.find(m => m.id === debt.to)
  const fromIndex  = members.findIndex(m => m.id === debt.from)
  const toIndex    = members.findIndex(m => m.id === debt.to)
  const getMember  = (id: string) => members.find(m => m.id === id)

  // A) from tham gia — người khác đã chi (from chưa trả)
  //    isDirect = người chi là debt.to (trực tiếp)
  //    !isDirect = người chi là bên thứ 3, khoản nợ được tối giản hóa chuyển sang debt.to
  const participantItems = expenses
    .filter(e =>
      !e.paidFromFund &&
      e.paidBy !== debt.from &&
      e.participants.includes(debt.from) &&
      !e.settlements[debt.from]?.paid
    )
    .map(e => ({
      expense: e,
      share: getShare(e, debt.from),
      isDirect: e.paidBy === debt.to,
    }))

  // B) from đã chi hộ nhóm — phân tích từng người được hưởng
  //    isDirect = người hưởng là debt.to → trực tiếp giảm nợ
  //    !isDirect = người hưởng là bên thứ 3 → tối giản hóa: bên thứ 3 trả thẳng cho debt.to, từ bớt nợ
  const payerShareItems = expenses
    .filter(e =>
      !e.paidFromFund &&
      e.paidBy === debt.from &&
      !e.participants.every(p => e.settlements[p]?.paid)
    )
    .flatMap(e => {
      return e.participants
        .filter(p => p !== debt.from && !e.settlements[p]?.paid)
        .map(p => ({
          expense: e,
          participant: p,
          share: getShare(e, p),
          isDirect: p === debt.to,
        }))
    })

  const directIn    = participantItems.filter(i => i.isDirect)
  const reroutedIn  = participantItems.filter(i => !i.isDirect)
  const directOut   = payerShareItems.filter(i => i.isDirect)
  const reroutedOut = payerShareItems.filter(i => !i.isDirect)

  const totalIn     = participantItems.reduce((s, i) => s + i.share, 0)
  const totalOut    = payerShareItems.reduce((s, i) => s + i.share, 0)
  const directInSum = directIn.reduce((s, i) => s + i.share, 0)
  const reroutedInSum = reroutedIn.reduce((s, i) => s + i.share, 0)

  const hasUnsettled = directIn.length > 0

  async function handleSettle() {
    setSettling(true)
    try {
      const updates: Promise<unknown>[] = []
      const fromName = fromMember?.displayName ?? '?'

      for (const e of expenses) {
        if (e.paidFromFund) continue

        // Tích lũy tất cả thay đổi settlement cho expense này, rồi update 1 lần với allSettled
        const settlementUpdates: Record<string, Partial<Settlement>> = {}
        const projectedSettlements = { ...e.settlements }

        // 1) from là người tham gia khoản người khác chi → đánh dấu đã trả
        if (e.participants.includes(debt.from) && !e.settlements[debt.from]?.paid) {
          settlementUpdates[debt.from] = { paid: true }
          projectedSettlements[debt.from] = { paid: true, paidAt: new Date() }

          // Tối giản: nếu khoản chi không phải do to chi → from đã trả thay payer cho to
          if (e.paidBy !== debt.to && e.paidBy !== debt.from) {
            const share = getShare(e, debt.from)
            const payerName = getMember(e.paidBy)?.displayName ?? '?'
            const newSettlements = Object.fromEntries(
              members.map(m => {
                const isParticipant = m.id === debt.to
                const isPayer = m.id === e.paidBy
                const paid = !isParticipant || isPayer
                return [m.id, { paid, paidAt: null }]
              })
            )
            updates.push(addDoc(expensesCol(roomId), {
              title: `${e.title} (${fromName} trả thay ${payerName})`,
              amount: share,
              paidBy: e.paidBy,
              participants: [debt.to],
              category: e.category,
              date: serverTimestamp(),
              createdAt: serverTimestamp(),
              paidFromFund: false,
              settlements: newSettlements,
              allSettled: computeAllSettled([debt.to], newSettlements),
            }))
          }
        }

        // 2) from là người chi:
        //    - to tham gia: đánh dấu đã trả (giảm nợ trực tiếp)
        //    - bên thứ 3 tham gia: tối giản chuyển nợ sang to → tạo khoản mới do to chi hộ
        if (e.paidBy === debt.from) {
          for (const p of e.participants) {
            if (e.settlements[p]?.paid) continue
            if (p === debt.from) continue

            settlementUpdates[p] = { paid: true }
            projectedSettlements[p] = { paid: true, paidAt: new Date() }

            // Nếu là bên thứ 3 → tạo khoản mới: to chi hộ p, p còn nợ to
            if (p !== debt.to) {
              const share = getShare(e, p)
              const newSettlements = Object.fromEntries(
                members.map(m => {
                  const isParticipant = m.id === p
                  const isPayer = m.id === debt.to
                  const paid = !isParticipant || isPayer
                  return [m.id, { paid, paidAt: null }]
                })
              )
              updates.push(addDoc(expensesCol(roomId), {
                title: `${e.title} (tối giản từ ${fromName})`,
                amount: share,
                paidBy: debt.to,
                participants: [p],
                category: e.category,
                date: serverTimestamp(),
                createdAt: serverTimestamp(),
                paidFromFund: false,
                settlements: newSettlements,
                allSettled: computeAllSettled([p], newSettlements),
              }))
            }
          }
        }

        // Apply tích lũy + allSettled cho expense gốc
        const settlementKeys = Object.keys(settlementUpdates)
        if (settlementKeys.length > 0) {
          const updateData: Record<string, unknown> = {
            allSettled: computeAllSettled(e.participants, projectedSettlements),
          }
          for (const uid of settlementKeys) {
            updateData[`settlements.${uid}.paid`] = true
            updateData[`settlements.${uid}.paidAt`] = serverTimestamp()
          }
          updates.push(updateDoc(doc(expensesCol(roomId), e.id), updateData))
        }
      }
      await Promise.all(updates)
      await logActivity(roomId, {
        type: 'debt.settled',
        actorId: debt.from,
        title: `🤝 Đã thanh toán nợ`,
        body: `${fromMember?.displayName ?? '?'} đã trả ${toMember?.displayName ?? '?'} ${formatVND(debt.amount)}`,
        meta: { debtFrom: debt.from, debtTo: debt.to, amount: debt.amount },
      })
      toast.success('Đã đánh dấu thanh toán!')
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setSettling(false)
    }
  }

  // Công thức hiển thị
  const formulaStr = (() => {
    if (totalIn > 0 && totalOut > 0)
      return `${formatVND(totalIn)} − ${formatVND(totalOut)}`
    if (reroutedInSum > 0 && directInSum > 0)
      return `${formatVND(directInSum)} + ${formatVND(reroutedInSum)}`
    return null
  })()

  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      {/* Avatars */}
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

      {/* Summary row */}
      <div className="flex justify-between items-center">
        <button onClick={() => setExpanded(!expanded)} className="text-xs text-gray-400 underline">
          {participantItems.length} khoản {expanded ? '▲' : '▼'}
        </button>
        <div className="flex items-center gap-2">
          {hasUnsettled && (
            <button onClick={() => setConfirming(true)} disabled={settling}
              className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1">
              💸 Đánh dấu đã trả
            </button>
          )}
          <p className="font-extrabold text-red-500">{formatVND(debt.amount)}</p>
        </div>
      </div>

      {/* Expanded breakdown */}
      {expanded && (
        <div className="mt-2 border-t border-dashed border-amber-200 pt-2 space-y-3 text-xs">

          {/* A-Direct: to chi trực tiếp cho from */}
          {directIn.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-red-400 uppercase mb-1.5">
                {toMember?.displayName} đã chi — {fromMember?.displayName} tham gia
              </p>
              <div className="space-y-1">
                {directIn.map(({ expense: e, share }) => (
                  <div key={e.id} className="flex justify-between">
                    <span className="text-gray-600 flex-1 pr-2 truncate">{e.title}</span>
                    <span className="text-red-400 font-semibold shrink-0">+{formatVND(share)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* A-Rerouted: bên thứ 3 chi cho from, nợ được chuyển sang to */}
          {reroutedIn.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-orange-400 uppercase mb-1.5">
                Người khác chi hộ → tối giản chuyển sang {toMember?.displayName}
              </p>
              <div className="space-y-2">
                {reroutedIn.map(({ expense: e, share }) => {
                  const payerName = getMember(e.paidBy)?.displayName ?? '?'
                  return (
                    <div key={e.id}>
                      <div className="flex justify-between">
                        <span className="text-gray-600 flex-1 pr-2 truncate">{e.title}</span>
                        <span className="text-orange-400 font-semibold shrink-0">+{formatVND(share)}</span>
                      </div>
                      <p className="text-gray-400 mt-0.5 leading-tight">
                        ↳ {payerName} chi → {fromMember?.displayName} lẽ ra nợ {payerName} {formatVND(share)} → tối giản: {fromMember?.displayName} trả thẳng {toMember?.displayName}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* B: from chi hộ nhóm, phân tích từng phần */}
          {payerShareItems.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-green-500 uppercase mb-1.5">
                {fromMember?.displayName} đã chi hộ → trừ vào nợ
              </p>
              <div className="space-y-2">
                {directOut.map(({ expense: e, share }) => (
                  <div key={`${e.id}-d`}>
                    <div className="flex justify-between">
                      <span className="text-gray-600 flex-1 pr-2 truncate">{e.title} · phần {toMember?.displayName}</span>
                      <span className="text-green-500 font-semibold shrink-0">−{formatVND(share)}</span>
                    </div>
                    <p className="text-gray-400 mt-0.5">↳ {toMember?.displayName} nợ {fromMember?.displayName} → trực tiếp giảm nợ</p>
                  </div>
                ))}
                {reroutedOut.map(({ expense: e, share, participant }) => {
                  const pName = getMember(participant)?.displayName ?? '?'
                  return (
                    <div key={`${e.id}-${participant}`}>
                      <div className="flex justify-between">
                        <span className="text-gray-600 flex-1 pr-2 truncate">{e.title} · phần {pName}</span>
                        <span className="text-green-500 font-semibold shrink-0">−{formatVND(share)}</span>
                      </div>
                      <p className="text-gray-400 mt-0.5 leading-tight">
                        ↳ {pName} nợ {fromMember?.displayName} {formatVND(share)} → tối giản: {pName} trả thẳng {toMember?.displayName}
                      </p>
                    </div>
                  )
                })}
                <div className="flex justify-between font-semibold text-green-500 border-t border-dashed border-green-100 pt-1">
                  <span>Tổng trừ</span>
                  <span>−{formatVND(totalOut)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Net formula */}
          <div className="bg-amber-50 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
            {formulaStr
              ? <span className="text-amber-700 text-[11px]">{formulaStr} =</span>
              : <span className="text-amber-700 text-xs">Tổng nợ</span>
            }
            <span className="text-sm font-extrabold text-red-500 shrink-0">{formatVND(debt.amount)}</span>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6"
          onClick={() => setConfirming(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-5 w-full max-w-xs shadow-xl"
            onClick={e => e.stopPropagation()}>
            <p className="text-base font-extrabold text-gray-800 mb-1 text-center">Xác nhận thanh toán?</p>
            <p className="text-xs text-gray-500 text-center mb-4">
              <span className="font-semibold text-gray-700">{fromMember?.displayName ?? '?'}</span>
              {' '}đã trả{' '}
              <span className="font-extrabold text-red-500">{formatVND(debt.amount)}</span>
              {' '}cho{' '}
              <span className="font-semibold text-gray-700">{toMember?.displayName ?? '?'}</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setConfirming(false)}
                className="py-2 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-500">
                Huỷ
              </button>
              <button
                disabled={settling}
                onClick={async () => { setConfirming(false); await handleSettle() }}
                className="py-2 rounded-xl bg-gradient-to-r from-amber-400 to-red-500 text-white text-sm font-bold disabled:opacity-50">
                {settling ? '⏳ Đang lưu...' : '✓ Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
