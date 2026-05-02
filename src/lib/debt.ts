// src/lib/debt.ts
import type { Expense, DebtEdge } from '@/src/types'
import { getShare } from '@/src/lib/expense'

/**
 * Direct simplification: chỉ gộp pair-wise (A↔B). Giữ nguyên dạng "chain":
 * mỗi người tự xử lý nợ của mình thay vì 1 người gánh trả nhiều nơi.
 *
 * Với case A→B 50, B→C 50 (B passthrough): direct = 2 edges, không tự nén thành A→C.
 */
function directSimplify(expenses: Expense[]): DebtEdge[] {
  const directDebts: Record<string, Record<string, number>> = {}
  const addDebt = (from: string, to: string, amount: number) => {
    if (!directDebts[from]) directDebts[from] = {}
    directDebts[from][to] = (directDebts[from][to] ?? 0) + amount
  }

  for (const exp of expenses) {
    if (exp.paidFromFund) continue
    if (exp.participants.length === 0) continue
    if (exp.allSettled === true) continue

    for (const p of exp.participants) {
      if (p === exp.paidBy) continue
      if (exp.settlements[p]?.paid) continue
      const share = getShare(exp, p)
      addDebt(p, exp.paidBy, share)
    }
  }

  // Net opposing pairs (A→B vs B→A)
  const edges: DebtEdge[] = []
  const seen = new Set<string>()
  for (const from of Object.keys(directDebts)) {
    for (const to of Object.keys(directDebts[from])) {
      const pairKey = [from, to].sort().join('|')
      if (seen.has(pairKey)) continue
      seen.add(pairKey)
      const fromTo = directDebts[from]?.[to] ?? 0
      const toFrom = directDebts[to]?.[from] ?? 0
      const net = fromTo - toFrom
      if (Math.abs(net) > 0.5) {
        if (net > 0) edges.push({ from, to, amount: Math.round(net) })
        else edges.push({ from: to, to: from, amount: Math.round(-net) })
      }
    }
  }
  return edges
}

/**
 * Greedy simplification: nén tối đa số transaction bằng cách match
 * largest debtor với largest creditor. Có thể "nén" qua passthrough nodes
 * (vd A→B→C với B net 0 → A→C 1 edge).
 */
function greedySimplify(expenses: Expense[], members: Record<string, string>): DebtEdge[] {
  const balance: Record<string, number> = {}
  for (const uid of Object.keys(members)) balance[uid] = 0

  for (const exp of expenses) {
    if (exp.paidFromFund) continue
    if (exp.participants.length === 0) continue
    if (exp.allSettled === true) continue

    balance[exp.paidBy] = (balance[exp.paidBy] ?? 0) + exp.amount
    for (const p of exp.participants) {
      const share = getShare(exp, p)
      balance[p] = (balance[p] ?? 0) - share
    }
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

/**
 * Hybrid: ưu tiên direct (chain-natural), chỉ dùng greedy khi nó GIẢM số edge.
 *
 * Ví dụ user A nợ B 140, B nợ C 60:
 *   - direct: 2 edges (A→B 140, B→C 60) — chain
 *   - greedy: 2 edges (A→B 80, A→C 60) — fan-out, cùng số edge
 *   → chọn direct
 *
 * Ví dụ A→B 50, B→C 50 (B passthrough):
 *   - direct: 2 edges
 *   - greedy: 1 edge (A→C 50)
 *   → chọn greedy (giảm 1 edge)
 */
export function simplifyDebts(
  expenses: Expense[],
  members: Record<string, string>,
): DebtEdge[] {
  const direct = directSimplify(expenses)
  const greedy = greedySimplify(expenses, members)
  return greedy.length < direct.length ? greedy : direct
}
