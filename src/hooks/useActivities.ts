'use client'
import { useEffect, useMemo, useState } from 'react'
import { onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { activitiesCol } from '@/src/lib/firebase/collections'
import type { Activity } from '@/src/types'

export function useActivities(roomId: string | undefined, currentUserId: string | undefined) {
  const [activities, setActivities] = useState<Activity[]>([])

  useEffect(() => {
    if (!roomId) return
    const q = query(activitiesCol(roomId), orderBy('createdAt', 'desc'), limit(50))
    return onSnapshot(q, snap => {
      setActivities(snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate() ?? new Date(),
      } as Activity)))
    })
  }, [roomId])

  const unreadCount = useMemo(() => {
    if (!currentUserId) return 0
    return activities.filter(a => !a.readBy?.[currentUserId]).length
  }, [activities, currentUserId])

  return { activities, unreadCount }
}
