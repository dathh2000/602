'use client'
import { useState } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { expensesCol } from '@/src/lib/firebase/collections'
import { BottomSheet } from '@/src/components/ui/BottomSheet'
import { Avatar } from '@/src/components/ui/Avatar'
import { Tag } from '@/src/components/ui/Tag'
import { EditExpenseSheet } from '@/src/components/expense/EditExpenseSheet'
import { ConfirmDialog } from '@/src/components/ui/ConfirmDialog'
import { logActivity } from '@/src/lib/activity'
import { computeAllSettled, getShare, hasCustomShares } from '@/src/lib/expense'
import { formatVND, formatDate, getImages } from '@/src/lib/utils'
import { buildVietQRUrl } from '@/src/lib/vietqr'
import { findBank } from '@/src/lib/banks'
import { saveOrShareImage } from '@/src/lib/saveImage'
import type { Expense, Member } from '@/src/types'
import toast from 'react-hot-toast'

const CATEGORY_LABEL: Record<string, string> = {
  food: '🍜 Đồ ăn', grocery: '🛒 Đi chợ', transport: '🚗 Di chuyển',
  repair: '🔧 Sửa chữa', other: '📌 Khác',
}

interface Props {
  open: boolean
  onClose: () => void
  expense: Expense
  members: Member[]
  roomId: string
  currentUserId: string
}

export function ExpenseDetailSheet({ open, onClose, expense, members, roomId, currentUserId }: Props) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [confirming, setConfirming] = useState<{ uid: string; isPaid: boolean } | null>(null)

  const payer      = members.find(m => m.id === expense.paidBy)
  const payerIndex = members.findIndex(m => m.id === expense.paidBy)
  const equalShare = expense.participants.length > 0 ? expense.amount / expense.participants.length : 0
  const isCustomShares = hasCustomShares(expense)
  const allSettled = expense.participants.every(p => expense.settlements[p]?.paid)
  const anyNonPayerPaid = expense.participants
    .filter(p => p !== expense.paidBy)
    .some(p => expense.settlements[p]?.paid)
  const canEdit = !expense.paidFromFund && !anyNonPayerPaid

  async function toggleSettlement(userId: string, currentPaid: boolean) {
    setUpdating(userId)
    try {
      const newPaid = !currentPaid
      const projectedSettlements = {
        ...expense.settlements,
        [userId]: { paid: newPaid, paidAt: newPaid ? new Date() : null },
      }
      const newAllSettled = computeAllSettled(expense.participants, projectedSettlements)

      await updateDoc(doc(expensesCol(roomId), expense.id), {
        [`settlements.${userId}.paid`]: newPaid,
        [`settlements.${userId}.paidAt`]: newPaid ? serverTimestamp() : null,
        allSettled: newAllSettled,
      })
      if (!currentPaid) {
        const memberName = members.find(m => m.id === userId)?.displayName ?? '?'
        const payerName = members.find(m => m.id === expense.paidBy)?.displayName ?? '?'
        const userShare = getShare(expense, userId)
        await logActivity(roomId, {
          type: 'expense.settled',
          actorId: currentUserId,
          title: `✓ ${memberName} đã trả ${payerName}`,
          body: `${expense.title} · ${formatVND(userShare)}`,
          meta: { expenseId: expense.id, amount: userShare },
        })
      }
      toast.success(!currentPaid ? 'Đã đánh dấu đã trả' : 'Đã bỏ đánh dấu')
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <>
      <BottomSheet open={open} onClose={onClose} title={`📋 ${expense.title}`}>
        <div className="space-y-4">

          {/* Header */}
          <div>
            <div className="flex justify-between items-start mb-1">
              <h2 className="text-base font-extrabold text-gray-800 flex-1 pr-2">{expense.title}</h2>
              <div className="flex items-center gap-2 shrink-0">
                {canEdit && (
                  <button onClick={() => setEditOpen(true)}
                    className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-700">
                    ✏️ Sửa
                  </button>
                )}
                <span className="text-lg font-extrabold text-red-500">{formatVND(expense.amount)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">{expense.date ? formatDate(expense.date) : ''}</span>
              <Tag label={CATEGORY_LABEL[expense.category] ?? '📌 Khác'} variant="yellow" />
              {expense.paidFromFund
                ? <Tag label="💰 Từ quỹ" variant="green" />
                : allSettled
                  ? <Tag label="✓ Xong" variant="green" />
                  : <Tag label="Chưa trả đủ" variant="red" />
              }
            </div>
          </div>

          {/* Payer */}
          <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-3">
            <Avatar name={payer?.displayName ?? '?'} index={payerIndex} size="md" />
            <div>
              <p className="text-xs text-amber-600 font-semibold">Người chi</p>
              <p className="text-sm font-bold text-gray-800">{payer?.displayName ?? '?'}</p>
            </div>
            <span className="ml-auto text-sm font-extrabold text-amber-700">{formatVND(expense.amount)}</span>
          </div>

          {/* Ảnh đính kèm */}
          {(() => {
            const images = getImages(expense)
            if (images.length === 0) return null
            return (
              <div>
                <p className="text-xs text-amber-700 font-bold uppercase mb-2">
                  Ảnh đính kèm ({images.length})
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {images.map((url, i) => (
                    <a key={url + i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`receipt ${i + 1}`}
                        className="w-full aspect-square object-cover rounded-xl border-2 border-amber-100" />
                    </a>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Participants */}
          {!expense.paidFromFund && expense.participants.length > 0 && (
            <div>
              <p className="text-xs text-amber-700 font-bold uppercase mb-2">
                Chia cho {expense.participants.length} người
                {isCustomShares
                  ? <span className="ml-1 normal-case font-normal">· tùy chỉnh</span>
                  : <span className="ml-1 normal-case font-normal">· {formatVND(equalShare)}/người</span>}
              </p>
              <div className="space-y-2">
                {expense.participants.map(uid => {
                  const member      = members.find(m => m.id === uid)
                  const memberIndex = members.findIndex(m => m.id === uid)
                  const isPaid      = expense.settlements[uid]?.paid ?? false
                  const isPayer     = uid === expense.paidBy
                  const canToggle   = currentUserId === uid || currentUserId === expense.paidBy

                  return (
                    <div key={uid} className={`flex items-center gap-3 p-2 rounded-xl border-2 ${isPaid ? 'border-green-200 bg-green-50' : 'border-amber-100 bg-white'}`}>
                      <Avatar name={member?.displayName ?? '?'} index={memberIndex} size="md" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">
                          {member?.displayName ?? '?'}
                          {isPayer && <span className="text-xs text-amber-500 ml-1">(người chi)</span>}
                        </p>
                        <p className="text-xs text-gray-400">{formatVND(getShare(expense, uid))}</p>
                      </div>
                      {isPaid
                        ? <span className="text-green-600 text-xs font-bold">✓ Đã trả</span>
                        : <span className="text-red-400 text-xs font-bold">Chưa trả</span>
                      }
                      {canToggle && !isPayer && (
                        <button
                          onClick={() => setConfirming({ uid, isPaid })}
                          disabled={updating === uid}
                          className={`text-xs font-bold px-2 py-1 rounded-lg ml-1 ${isPaid ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'} disabled:opacity-50`}>
                          {updating === uid ? '...' : isPaid ? 'Bỏ' : '✓'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>

      {editOpen && (
        <EditExpenseSheet
          open={editOpen}
          onClose={() => setEditOpen(false)}
          expense={expense}
          members={members}
          roomId={roomId}
        />
      )}

      {/* Bỏ đánh dấu — confirm đơn giản */}
      {confirming?.isPaid && (
        <ConfirmDialog
          open={true}
          title="Bỏ đánh dấu đã trả?"
          message={
            <>
              <span className="font-semibold text-gray-700">
                {members.find(x => x.id === confirming.uid)?.displayName ?? '?'}
              </span>
              {' chưa trả '}
              <span className="font-extrabold text-red-500">{formatVND(getShare(expense, confirming.uid))}</span>
              {' cho '}
              <span className="font-semibold text-gray-700">{payer?.displayName ?? '?'}</span>
            </>
          }
          loading={updating === confirming.uid}
          onCancel={() => setConfirming(null)}
          onConfirm={async () => {
            const { uid, isPaid } = confirming
            setConfirming(null)
            await toggleSettlement(uid, isPaid)
          }}
        />
      )}

      {/* Đánh dấu đã trả — dialog có QR nếu payer có STK */}
      {confirming && !confirming.isPaid && (() => {
        const debtor = members.find(x => x.id === confirming.uid)
        const recipientBank = payer?.bankAccount
        const bankInfo = recipientBank ? findBank(recipientBank.bankBin) : null
        const itemShare = getShare(expense, confirming.uid)
        const qrUrl = recipientBank ? buildVietQRUrl({
          bin: recipientBank.bankBin,
          accountNumber: recipientBank.accountNumber,
          amount: itemShare,
          addInfo: `Tra ${expense.title} ${debtor?.displayName ?? ''}`.slice(0, 50),
          accountName: recipientBank.accountName,
        }) : null

        async function copyAccount() {
          if (!recipientBank) return
          try {
            await navigator.clipboard.writeText(recipientBank.accountNumber)
            toast.success('Đã copy số TK')
          } catch { toast.error('Không copy được') }
        }

        async function saveQR() {
          if (!qrUrl) return
          const fname = `vietqr-${payer?.displayName ?? 'transfer'}-${itemShare}.png`.replace(/\s+/g, '_')
          const result = await saveOrShareImage(qrUrl, fname)
          if (result === 'shared') toast.success('Mở được trình share')
          else if (result === 'downloaded') toast.success('Đã tải ảnh QR')
          else toast('Mở ảnh — long-press để lưu', { icon: '💡' })
        }

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4"
            onClick={() => setConfirming(null)}>
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <p className="text-base font-extrabold text-gray-800 mb-1 text-center">Xác nhận đã trả?</p>
              <p className="text-xs text-gray-500 text-center mb-3">
                <span className="font-semibold text-gray-700">{debtor?.displayName ?? '?'}</span>
                {' trả '}
                <span className="font-extrabold text-red-500">{formatVND(itemShare)}</span>
                {' cho '}
                <span className="font-semibold text-gray-700">{payer?.displayName ?? '?'}</span>
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
                  💡 {payer?.displayName ?? '?'} chưa thêm STK ngân hàng. Yêu cầu họ vào trang Thành viên để thêm.
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setConfirming(null)}
                  className="py-2 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-500">
                  Huỷ
                </button>
                <button disabled={updating === confirming.uid}
                  onClick={async () => {
                    const { uid, isPaid } = confirming
                    setConfirming(null)
                    await toggleSettlement(uid, isPaid)
                  }}
                  className="py-2 rounded-xl bg-gradient-to-r from-amber-400 to-red-500 text-white text-sm font-bold disabled:opacity-50">
                  {updating === confirming.uid ? '⏳ Đang lưu...' : '✓ Đã chuyển xong'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </>
  )
}
