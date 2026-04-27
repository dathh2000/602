import type { Settlement } from '@/src/types'

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
