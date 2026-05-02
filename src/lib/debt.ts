// src/lib/debt.ts
import type { Expense, DebtEdge } from '@/src/types'
import { getShare } from '@/src/lib/expense'

/**
 * Direct simplification: cộng dồn nợ pair-wise, net opposing pairs.
 *
 * KHÔNG nén qua passthrough (vd A→B 50 + B→C 50 vẫn là 2 edges).
 * Đổi lại: handleSettle predictable 100% — chỉ mark cặp (from, to) trực tiếp,
 * không tạo synthetic, không mark người thứ 3 → tránh hoàn toàn bug "settle nhảy nợ".
 */
export function simplifyDebts(
  expenses: Expense[],
  members: Record<string, string>,
): DebtEdge[] {
  const directDebts: Record<string, Record<string, number>> = {}
  const addDebt = (from: string, to: string, amount: number) => {
    if (!directDebts[from]) directDebts[from] = {}
    directDebts[from][to] = (directDebts[from][to] ?? 0) + amount
  }

  // members chỉ dùng để skip docs có participant không tồn tại trong room (defensive)
  void members

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
