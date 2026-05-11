import { getShare } from './expense'
import type { Expense, Member } from '@/src/types'

export interface MyDebtRow {
  expense: Expense
  creditor: Member | undefined  // the person `currentUserId` owes; undefined if member record missing
  share: number
}

/**
 * Builds the flat list of rows for the "my unsettled debts" report. One row per
 * unsettled (expense × currentUserId-is-debtor) pair. Mirrors the filtering used
 * by DebtCard's `directIn` computation, but scoped to a single user and across
 * every unsettled expense rather than one debt pair.
 */
export function buildMyDebtRows(
  expenses: Expense[],
  members: Member[],
  currentUserId: string,
): MyDebtRow[] {
  const memberById = new Map(members.map(m => [m.id, m] as const))
  const rows: MyDebtRow[] = []

  for (const e of expenses) {
    if (e.paidFromFund) continue
    if (e.paidBy === currentUserId) continue
    if (!e.participants.includes(currentUserId)) continue
    if (e.settlements[currentUserId]?.paid === true) continue

    rows.push({
      expense: e,
      creditor: memberById.get(e.paidBy),
      share: getShare(e, currentUserId),
    })
  }

  rows.sort((a, b) => {
    const dt = b.expense.date.getTime() - a.expense.date.getTime()
    if (dt !== 0) return dt
    return b.expense.createdAt.getTime() - a.expense.createdAt.getTime()
  })

  return rows
}
