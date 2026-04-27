'use client'
import { useCallback, useEffect, useState } from 'react'
import { onSnapshot, query, where, limit, type QueryConstraint } from 'firebase/firestore'
import { billsCol } from '@/src/lib/firebase/collections'
import type { Bill } from '@/src/types'

/**
 * useBills(roomId): không pagination, load tất cả bill active (dùng cho dashboard "sắp đến hạn")
 * useBills(roomId, pageSize): pagination, dùng cho list trang Hóa đơn
 *
 * Không dùng orderBy ở DB level để tránh yêu cầu composite index. Sort client-side theo dueDay.
 */
export function useBills(roomId: string | undefined, pageSize?: number) {
  const [bills, setBills] = useState<Bill[]>([])
  const [pageLimit, setPageLimit] = useState(pageSize ?? null)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (!roomId) return
    const constraints: QueryConstraint[] = [where('active', '==', true)]
    if (pageLimit !== null) constraints.push(limit(pageLimit))
    const q = query(billsCol(roomId), ...constraints)
    return onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Bill))
      docs.sort((a, b) => a.dueDay - b.dueDay)
      setBills(docs)
      if (pageLimit !== null) setHasMore(snap.size === pageLimit)
    })
  }, [roomId, pageLimit])

  const loadMore = useCallback(() => {
    if (!pageSize) return
    setPageLimit(p => (p ?? 0) + pageSize)
  }, [pageSize])

  return { bills, hasMore: pageSize ? hasMore : false, loadMore }
}
