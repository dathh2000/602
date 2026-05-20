'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { activitiesCol } from '@/src/lib/firebase/collections'
import type { Activity } from '@/src/types'

const DEFAULT_PAGE = 20

export function useActivities(
  roomId: string | undefined,
  currentUserId: string | undefined,
  pageSize: number = DEFAULT_PAGE,
) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [pageLimit, setPageLimit] = useState(pageSize)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (!roomId) return
    const q = query(activitiesCol(roomId), orderBy('createdAt', 'desc'), limit(pageLimit))
    // `includeMetadataChanges: true` + the `fromCache` guard prevent the
    // "— Hết —" flash on fresh loads: cache-only snapshots may briefly return
    // fewer than pageLimit items while the server reply is in flight. We only
    // flip hasMore once we've seen server-confirmed data.
    return onSnapshot(q, { includeMetadataChanges: true }, snap => {
      setActivities(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() ?? new Date(),
      } as Activity)))
      if (!snap.metadata.fromCache) setHasMore(snap.size === pageLimit)
    })
  }, [roomId, pageLimit])

  const unreadCount = useMemo(() => {
    if (!currentUserId) return 0
    return activities.filter(a => !a.readBy?.[currentUserId]).length
  }, [activities, currentUserId])

  const loadMore = useCallback(() => {
    setPageLimit(p => p + pageSize)
  }, [pageSize])

  return { activities, unreadCount, hasMore, loadMore }
}
