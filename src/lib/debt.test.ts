// src/lib/debt.test.ts
import { describe, it, expect } from 'vitest'
import { simplifyDebts } from './debt'
import type { Expense } from '@/types'

const mkExpense = (overrides: Partial<Expense>): Expense => ({
  id: 'e1', title: 'test', amount: 100, paidBy: 'A',
  participants: ['A', 'B'], category: 'food', date: new Date(),
  paidFromFund: false, createdAt: new Date(),
  settlements: { A: { paid: false, paidAt: null }, B: { paid: false, paidAt: null } },
  ...overrides,
})

describe('simplifyDebts', () => {
  it('returns empty when no expenses', () => {
    expect(simplifyDebts([], {})).toEqual([])
  })

  it('A pays 90k for A+B → B owes A 45k', () => {
    const expenses = [mkExpense({ amount: 90000, paidBy: 'A', participants: ['A', 'B'] })]
    const members = { A: 'A', B: 'B' }
    const result = simplifyDebts(expenses, members)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ from: 'B', to: 'A', amount: 45000 })
  })

  it('skips paidFromFund expenses', () => {
    const expenses = [mkExpense({ paidFromFund: true })]
    expect(simplifyDebts(expenses, { A: 'A', B: 'B' })).toEqual([])
  })

  it('skips fully settled expenses', () => {
    const expenses = [mkExpense({
      settlements: {
        A: { paid: true, paidAt: new Date() },
        B: { paid: true, paidAt: new Date() },
      }
    })]
    expect(simplifyDebts(expenses, { A: 'A', B: 'B' })).toEqual([])
  })

  it('simplifies: A owes B 100k AND C owes B 50k → 2 edges not 3', () => {
    const e1 = mkExpense({ id: 'e1', amount: 200000, paidBy: 'B', participants: ['A', 'B'] })
    const e2 = mkExpense({ id: 'e2', amount: 100000, paidBy: 'B', participants: ['B', 'C'],
      settlements: { B: { paid: false, paidAt: null }, C: { paid: false, paidAt: null } } })
    const result = simplifyDebts([e1, e2], { A: 'A', B: 'B', C: 'C' })
    const totalDebt = result.reduce((s, e) => s + e.amount, 0)
    expect(totalDebt).toBe(150000) // 100k + 50k
    expect(result.every(e => e.to === 'B')).toBe(true)
  })
})
