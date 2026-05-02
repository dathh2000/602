'use client'
import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { expensesCol } from '@/src/lib/firebase/collections'
import { Avatar } from '@/src/components/ui/Avatar'
import { formatVND } from '@/src/lib/utils'
import { computeAllSettled, getShare } from '@/src/lib/expense'
import { logActivity } from '@/src/lib/activity'
import { buildVietQRUrl } from '@/src/lib/vietqr'
import { findBank } from '@/src/lib/banks'
import { saveOrShareImage } from '@/src/lib/saveImage'
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
  const [confirming, setConfirming] = useState(false)

  const fromMember = members.find(m => m.id === debt.from)
  const toMember   = members.find(m => m.id === debt.to)
  const fromIndex  = members.findIndex(m => m.id === debt.from)
  const toIndex    = members.findIndex(m => m.id === debt.to)

  // A) Khoản to chi — from tham gia chưa trả (cộng vào nợ from→to)
  const directIn = expenses
    .filter(e =>
      !e.paidFromFund &&
      e.paidBy === debt.to &&
      e.participants.includes(debt.from) &&
      !e.settlements[debt.from]?.paid
    )
    .map(e => ({
      expense: e,
      share: getShare(e, debt.from),
    }))

  // B) Khoản from chi — to tham gia chưa trả (trừ vào nợ from→to)
  //    Lưu ý: vì hybrid simplify, nếu cùng pair có cả 2 chiều (from→to và to→from)
  //    thì direct net đã trừ trước; ở đây chỉ list chiều to nợ from còn lại.
  const directOut = expenses
    .filter(e =>
      !e.paidFromFund &&
      e.paidBy === debt.from &&
      e.participants.includes(debt.to) &&
      !e.settlements[debt.to]?.paid
    )
    .map(e => ({
      expense: e,
      share: getShare(e, debt.to),
    }))

  const totalIn  = directIn.reduce((s, i) => s + i.share, 0)
  const totalOut = directOut.reduce((s, i) => s + i.share, 0)

  const hasUnsettled = directIn.length > 0 || totalIn - totalOut > 0.5

  async function handleSettle() {
    setSettling(true)
    try {
      const updates: Promise<unknown>[] = []

      // CHỈ mark settlement của ĐÚNG cặp (from, to). Không động đến người thứ 3, không tạo synthetic.
      // Quy tắc:
      //   - Khoản `to` chi, `from` là participant chưa trả → mark from settled
      //   - Khoản `from` chi, `to` là participant chưa trả → mark to settled
      // Mọi expense khác: bỏ qua.
      for (const e of expenses) {
        if (e.paidFromFund) continue

        const settlementUpdates: Record<string, true> = {}
        const projectedSettlements = { ...e.settlements }

        // Khoản `to` chi, `from` tham gia chưa trả
        if (e.paidBy === debt.to
            && e.participants.includes(debt.from)
            && !e.settlements[debt.from]?.paid) {
          settlementUpdates[debt.from] = true
          projectedSettlements[debt.from] = { paid: true, paidAt: new Date() }
        }

        // Khoản `from` chi, `to` tham gia chưa trả
        if (e.paidBy === debt.from
            && e.participants.includes(debt.to)
            && !e.settlements[debt.to]?.paid) {
          settlementUpdates[debt.to] = true
          projectedSettlements[debt.to] = { paid: true, paidAt: new Date() }
        }

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
  const formulaStr = totalIn > 0 && totalOut > 0
    ? `${formatVND(totalIn)} − ${formatVND(totalOut)}`
    : null

  const itemsCount = directIn.length + directOut.length

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
          {itemsCount} khoản {expanded ? '▲' : '▼'}
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

          {/* B: from chi hộ — to tham gia → giảm nợ */}
          {directOut.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-green-500 uppercase mb-1.5">
                {fromMember?.displayName} đã chi hộ — {toMember?.displayName} tham gia
              </p>
              <div className="space-y-1">
                {directOut.map(({ expense: e, share }) => (
                  <div key={`${e.id}-d`} className="flex justify-between">
                    <span className="text-gray-600 flex-1 pr-2 truncate">{e.title}</span>
                    <span className="text-green-500 font-semibold shrink-0">−{formatVND(share)}</span>
                  </div>
                ))}
                {totalOut > 0 && (
                  <div className="flex justify-between font-semibold text-green-500 border-t border-dashed border-green-100 pt-1">
                    <span>Tổng trừ</span>
                    <span>−{formatVND(totalOut)}</span>
                  </div>
                )}
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
      {confirming && (() => {
        const recipientBank = toMember?.bankAccount
        const bankInfo = recipientBank ? findBank(recipientBank.bankBin) : null
        const qrUrl = recipientBank ? buildVietQRUrl({
          bin: recipientBank.bankBin,
          accountNumber: recipientBank.accountNumber,
          amount: debt.amount,
          addInfo: `Tra no ${fromMember?.displayName ?? ''}`.slice(0, 50),
          accountName: recipientBank.accountName,
        }) : null

        async function copyAccount() {
          if (!recipientBank) return
          try {
            await navigator.clipboard.writeText(recipientBank.accountNumber)
            toast.success('Đã copy số TK')
          } catch {
            toast.error('Không copy được')
          }
        }

        async function saveQR() {
          if (!qrUrl) return
          const fname = `vietqr-${toMember?.displayName ?? 'transfer'}-${debt.amount}.png`.replace(/\s+/g, '_')
          const result = await saveOrShareImage(qrUrl, fname)
          if (result === 'shared') toast.success('Mở được trình share')
          else if (result === 'downloaded') toast.success('Đã tải ảnh QR')
          else toast('Mở ảnh — long-press để lưu', { icon: '💡' })
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
            onClick={() => setConfirming(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <p className="text-base font-extrabold text-gray-800 mb-1 text-center">Xác nhận thanh toán?</p>
              <p className="text-xs text-gray-500 text-center mb-3">
                <span className="font-semibold text-gray-700">{fromMember?.displayName ?? '?'}</span>
                {' '}trả{' '}
                <span className="font-extrabold text-red-500">{formatVND(debt.amount)}</span>
                {' '}cho{' '}
                <span className="font-semibold text-gray-700">{toMember?.displayName ?? '?'}</span>
              </p>

              {qrUrl ? (
                <div className="mb-4">
                  <div className="bg-amber-50 rounded-xl p-3 border-2 border-amber-200">
                    <p className="text-[10px] text-amber-700 font-bold uppercase text-center mb-2">
                      Quét QR bằng app ngân hàng
                    </p>
                    <img src={qrUrl} alt="VietQR" crossOrigin="anonymous"
                      className="w-full max-w-[260px] mx-auto rounded-lg bg-white" />
                    <button onClick={saveQR}
                      className="w-full mt-2 bg-white border-2 border-amber-200 rounded-lg py-1.5 text-xs font-bold text-amber-700 active:bg-amber-100">
                      💾 Lưu ảnh QR vào máy
                    </button>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Bank</span>
                        <span className="font-semibold">{bankInfo?.shortName ?? '?'}</span>
                      </div>
                      <button onClick={copyAccount}
                        className="w-full flex justify-between items-center bg-white rounded-lg px-2 py-1.5 border border-amber-100 active:bg-amber-50">
                        <span className="text-gray-500">Số TK</span>
                        <span className="font-bold tracking-wider text-amber-700">
                          {recipientBank?.accountNumber} 📋
                        </span>
                      </button>
                      {recipientBank?.accountName && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Tên TK</span>
                          <span className="font-semibold uppercase">{recipientBank.accountName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4 bg-gray-50 rounded-xl p-3 text-xs text-gray-500 text-center">
                  💡 {toMember?.displayName ?? '?'} chưa thêm STK ngân hàng. Yêu cầu họ vào trang Thành viên để thêm.
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setConfirming(false)}
                  className="py-2 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-500">
                  Huỷ
                </button>
                <button
                  disabled={settling}
                  onClick={async () => { setConfirming(false); await handleSettle() }}
                  className="py-2 rounded-xl bg-gradient-to-r from-amber-400 to-red-500 text-white text-sm font-bold disabled:opacity-50">
                  {settling ? '⏳ Đang lưu...' : '✓ Đã chuyển xong'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
