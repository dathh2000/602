'use client'
import { useEffect, useState } from 'react'
import { onSnapshot, query, where } from 'firebase/firestore'
import { billsCol } from '@/src/lib/firebase/collections'
import type { Bill } from '@/src/types'

export function useBills(roomId: string | undefined) {
  const [bills, setBills] = useState<Bill[]>([])
  useEffect(() => {
    if (!roomId) return
    const q = query(billsCol(roomId), where('active', '==', true))
    return onSnapshot(q, snap => {
      setBills(snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill)))
    })
  }, [roomId])
  return bills
}
