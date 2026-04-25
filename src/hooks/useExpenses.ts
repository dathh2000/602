'use client'
import { useEffect, useState } from 'react'
import { onSnapshot, orderBy, query } from 'firebase/firestore'
import { expensesCol } from '@/src/lib/firebase/collections'
import type { Expense } from '@/src/types'

export function useExpenses(roomId: string | undefined) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  useEffect(() => {
    if (!roomId) return
    const q = query(expensesCol(roomId), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data(),
        date: d.data().date?.toDate(),
        createdAt: d.data().createdAt?.toDate(),
        settlements: d.data().settlements ?? {},
      } as Expense)))
    })
  }, [roomId])
  return expenses
}
