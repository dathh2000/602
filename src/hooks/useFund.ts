'use client'
import { useEffect, useState } from 'react'
import { onSnapshot, orderBy, query } from 'firebase/firestore'
import { fundDoc, fundTxCol } from '@/src/lib/firebase/collections'
import type { Fund, FundTransaction } from '@/src/types'

export function useFund(roomId: string | undefined) {
  const [fund, setFund] = useState<Fund>({ balance: 0 })
  const [transactions, setTransactions] = useState<FundTransaction[]>([])

  useEffect(() => {
    if (!roomId) return
    const unsub1 = onSnapshot(fundDoc(roomId), snap => {
      if (snap.exists()) setFund(snap.data() as Fund)
    })
    const q = query(fundTxCol(roomId), orderBy('createdAt', 'desc'))
    const unsub2 = onSnapshot(q, snap => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data(),
        createdAt: d.data().createdAt?.toDate() } as FundTransaction)))
    })
    return () => { unsub1(); unsub2() }
  }, [roomId])

  return { fund, transactions }
}
