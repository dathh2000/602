// src/lib/debt.ts
import type { Expense, DebtEdge } from '@/src/types'
import { getShare } from '@/src/lib/expense'

/**
 * Tính toán nợ tối giản từ list expenses chưa hoàn tất.
 * Hỗ trợ custom shares per participant (qua `expense.shares`).
 */
export function simplifyDebts(
  expenses: Expense[],
  members: Record<string, string>
): DebtEdge[] {
  const balance: Record<string, number> = {}
  for (const uid of Object.keys(members)) balance[uid] = 0

  for (const exp of expenses) {
    if (exp.paidFromFund) continue
    if (exp.participants.length === 0) continue
    if (exp.allSettled === true) continue

    // Payer paid full amount, mỗi participant nợ phần share của họ
    balance[exp.paidBy] = (balance[exp.paidBy] ?? 0) + exp.amount
    for (const p of exp.participants) {
      const share = getShare(exp, p)
      balance[p] = (balance[p] ?? 0) - share
    }
    // Settled non-payer: phần share đã trả lại payer (cancel out)
    for (const p of exp.participants) {
      if (p === exp.paidBy) continue
      if (exp.settlements[p]?.paid) {
        const share = getShare(exp, p)
        balance[p] = (balance[p] ?? 0) + share
        balance[exp.paidBy] = (balance[exp.paidBy] ?? 0) - share
      }
    }
  }

  const creditors = Object.entries(balance).filter(([, v]) => v > 0.5).map(([id, v]) => ({ id, v }))
  const debtors  = Object.entries(balance).filter(([, v]) => v < -0.5).map(([id, v]) => ({ id, v }))
  const edges: DebtEdge[] = []

  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i].v, creditors[j].v)
    if (amount > 0.5) {
      edges.push({ from: debtors[i].id, to: creditors[j].id, amount: Math.round(amount) })
    }
    debtors[i].v += amount
    creditors[j].v -= amount
    if (Math.abs(debtors[i].v) < 0.5) i++
    if (Math.abs(creditors[j].v) < 0.5) j++
  }
  return edges
}
