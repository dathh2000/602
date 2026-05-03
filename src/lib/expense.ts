import type { Expense, ExpenseCategory, Settlement } from '@/src/types'

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'food',      label: '🍜 Đồ ăn'     },
  { value: 'grocery',   label: '🛒 Đi chợ'    },
  { value: 'transport', label: '🚗 Di chuyển' },
  { value: 'repair',    label: '🔧 Sửa chữa'  },
  { value: 'other',     label: '📌 Khác'      },
]

/**
 * Tính `allSettled` cho 1 expense:
 * - paidFromFund (participants rỗng) → true (không có gì để settle)
 * - Tất cả participants có settlement.paid === true → true
 * - Còn lại → false
 */
export function computeAllSettled(
  participants: string[],
  settlements: Record<string, Settlement> | undefined,
): boolean {
  if (!participants || participants.length === 0) return true
  if (!settlements) return false
  return participants.every(p => settlements[p]?.paid === true)
}

/**
 * Lấy phần share của 1 participant trong 1 expense:
 * - Nếu uid không trong participants → 0
 * - Nếu expense có `shares[uid]` → trả thẳng giá trị đó (custom)
 * - Mặc định → chia đều `amount / participants.length` (làm tròn)
 */
export function getShare(
  expense: Pick<Expense, 'amount' | 'participants' | 'shares'>,
  uid: string,
): number {
  if (!expense.participants.includes(uid)) return 0
  if (expense.shares && typeof expense.shares[uid] === 'number') {
    return expense.shares[uid]
  }
  if (expense.participants.length === 0) return 0
  return Math.round(expense.amount / expense.participants.length)
}

/** True nếu expense có share custom (không phải chia đều) */
export function hasCustomShares(
  expense: Pick<Expense, 'amount' | 'participants' | 'shares'>,
): boolean {
  if (!expense.shares) return false
  if (expense.participants.length === 0) return false
  const equalShare = Math.round(expense.amount / expense.participants.length)
  return expense.participants.some(p => {
    const s = expense.shares?.[p]
    return typeof s === 'number' && s !== equalShare
  })
}
