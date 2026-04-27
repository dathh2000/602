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
import { formatVND, formatDate } from '@/src/lib/utils'
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
  const share      = expense.participants.length > 0 ? expense.amount / expense.participants.length : 0
  const allSettled = expense.participants.every(p => expense.settlements[p]?.paid)
  const anyNonPayerPaid = expense.participants
    .filter(p => p !== expense.paidBy)
    .some(p => expense.settlements[p]?.paid)
  const canEdit = !expense.paidFromFund && !anyNonPayerPaid

  async function toggleSettlement(userId: string, currentPaid: boolean) {
    setUpdating(userId)
    try {
      await updateDoc(doc(expensesCol(roomId), expense.id), {
        [`settlements.${userId}.paid`]: !currentPaid,
        [`settlements.${userId}.paidAt`]: !currentPaid ? serverTimestamp() : null,
      })
      if (!currentPaid) {
        const memberName = members.find(m => m.id === userId)?.displayName ?? '?'
        const payerName = members.find(m => m.id === expense.paidBy)?.displayName ?? '?'
        await logActivity(roomId, {
          type: 'expense.settled',
          actorId: currentUserId,
          title: `✓ ${memberName} đã trả ${payerName}`,
          body: `${expense.title} · ${formatVND(share)}`,
          meta: { expenseId: expense.id, amount: share },
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
          {expense.imageUrl && (
            <div>
              <p className="text-xs text-amber-700 font-bold uppercase mb-2">Ảnh đính kèm</p>
              <a href={expense.imageUrl} target="_blank" rel="noopener noreferrer">
                <img src={expense.imageUrl} alt="receipt" className="w-full rounded-xl object-cover max-h-56 border-2 border-amber-100" />
              </a>
            </div>
          )}

          {/* Participants */}
          {!expense.paidFromFund && expense.participants.length > 0 && (
            <div>
              <p className="text-xs text-amber-700 font-bold uppercase mb-2">
                Chia cho {expense.participants.length} người · {formatVND(share)}/người
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
                        <p className="text-xs text-gray-400">{formatVND(share)}</p>
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

      <ConfirmDialog
        open={!!confirming}
        title={confirming?.isPaid ? 'Bỏ đánh dấu đã trả?' : 'Xác nhận đã trả?'}
        message={confirming ? (
          <>
            <span className="font-semibold text-gray-700">
              {members.find(x => x.id === confirming.uid)?.displayName ?? '?'}
            </span>
            {confirming.isPaid ? ' chưa trả' : ' đã trả'}{' '}
            <span className="font-extrabold text-red-500">{formatVND(share)}</span>
            {' '}cho{' '}
            <span className="font-semibold text-gray-700">{payer?.displayName ?? '?'}</span>
          </>
        ) : ''}
        loading={!!(confirming && updating === confirming.uid)}
        onCancel={() => setConfirming(null)}
        onConfirm={async () => {
          if (!confirming) return
          const { uid, isPaid } = confirming
          setConfirming(null)
          await toggleSettlement(uid, isPaid)
        }}
      />
    </>
  )
}
