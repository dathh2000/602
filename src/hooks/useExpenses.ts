'use client'
import { useCallback, useEffect, useState } from 'react'
import { onSnapshot, orderBy, query, limit, type QueryConstraint } from 'firebase/firestore'
import { expensesCol } from '@/src/lib/firebase/collections'
import type { Expense } from '@/src/types'

/**
 * Paginated expenses list (cho display trên dashboard, debts page settled list, ...).
 *
 * - useExpenses(roomId): không pagination, load tất cả (chỉ dùng nội bộ nếu cần)
 * - useExpenses(roomId, pageSize): pagination với infinite scroll
 *
 * KHÔNG dùng cho debt calc — debt cần tất cả unsettled, dùng `useExpensesUnsettled`.
 */
export function useExpenses(roomId: string | undefined, pageSize?: number) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [pageLimit, setPageLimit] = useState<number | null>(pageSize ?? null)
  const [hasMore, setHasMore] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!roomId) return
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')]
    if (pageLimit !== null) constraints.push(limit(pageLimit))
    const q = query(expensesCol(roomId), ...constraints)
    return onSnapshot(q, snap => {
      setExpenses(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.toDate(),
        createdAt: d.data().createdAt?.toDate(),
        settlements: d.data().settlements ?? {},
      } as Expense)))
      if (pageLimit !== null) setHasMore(snap.size === pageLimit)
      setLoaded(true)
    })
  }, [roomId, pageLimit])

  const loadMore = useCallback(() => {
    if (!pageSize) return
    setPageLimit(p => (p ?? 0) + pageSize)
  }, [pageSize])

  return { expenses, hasMore: pageSize ? hasMore : false, loadMore, loaded }
}
