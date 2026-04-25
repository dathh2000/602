// src/lib/debt.ts
import type { Expense, DebtEdge } from '@/src/types'

export function simplifyDebts(
  expenses: Expense[],
  members: Record<string, string>
): DebtEdge[] {
  const balance: Record<string, number> = {}
  for (const uid of Object.keys(members)) balance[uid] = 0

  for (const exp of expenses) {
    if (exp.paidFromFund) continue
    const allSettled = exp.participants.every(p => exp.settlements[p]?.paid)
    if (allSettled) continue

    const share = exp.amount / exp.participants.length
    for (const p of exp.participants) {
      if (exp.settlements[p]?.paid) continue
      balance[p] -= share
    }
    const settledCount = exp.participants.filter(p => exp.settlements[p]?.paid).length
    balance[exp.paidBy] += exp.amount - settledCount * share
  }

  const creditors = Object.entries(balance).filter(([, v]) => v > 0.5).map(([id, v]) => ({ id, v }))
  const debtors  = Object.entries(balance).filter(([, v]) => v < -0.5).map(([id, v]) => ({ id, v }))
  const edges: DebtEdge[] = []

  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i].v, creditors[j].v)
    if (amount > 0.5) {
      edges.push({ from: debtors[i].id, to: creditors[j].id, amount: Math.round(amount), expenseIds: [] })
    }
    debtors[i].v += amount
    creditors[j].v -= amount
    if (Math.abs(debtors[i].v) < 0.5) i++
    if (Math.abs(creditors[j].v) < 0.5) j++
  }
  return edges
}
