'use client'
import { useEffect, useState } from 'react'
import { onSnapshot, query, where } from 'firebase/firestore'
import { expensesCol } from '@/src/lib/firebase/collections'
import type { Expense } from '@/src/types'

/**
 * Trả về tất cả expense chưa settled (allSettled = false).
 * Bounded query — số lượng tối đa = số khoản chưa thanh toán hết, thường nhỏ.
 *
 * Dùng cho debt simplification: cần tất cả unsettled để tính chính xác.
 *
 * Lưu ý: doc cũ chưa migrate (allSettled === undefined) sẽ KHÔNG match query này.
 * Dùng `useExpensesMigration` để backfill trước.
 */
export function useExpensesUnsettled(roomId: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    if (!roomId) return
    const q = query(expensesCol(roomId), where('allSettled', '==', false))
    return onSnapshot(q, snap => {
      setExpenses(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        date: d.data().date?.toDate(),
        createdAt: d.data().createdAt?.toDate(),
        settlements: d.data().settlements ?? {},
      } as Expense)))
    })
  }, [roomId])

  return expenses
}
