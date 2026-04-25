import { useMemo } from 'react'
import { simplifyDebts } from '@/src/lib/debt'
import type { Expense, Member, DebtEdge } from '@/src/types'

export function useDebts(expenses: Expense[], members: Member[]): DebtEdge[] {
  return useMemo(() => {
    const memberMap = Object.fromEntries(members.map(m => [m.id, m.id]))
    return simplifyDebts(expenses, memberMap)
  }, [expenses, members])
}
