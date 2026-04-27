'use client'
import { useEffect } from 'react'
import { writeBatch, doc as fsDoc } from 'firebase/firestore'
import { db } from '@/src/lib/firebase/config'
import { activitiesCol } from '@/src/lib/firebase/collections'
import { BottomSheet } from '@/src/components/ui/BottomSheet'
import { ActivityItem } from '@/src/components/activity/ActivityItem'
import type { Activity, Member } from '@/src/types'

interface Props {
  open: boolean
  onClose: () => void
  roomId: string
  currentUserId: string
  members: Member[]
  activities: Activity[]
}

export function ActivityFeedSheet({ open, onClose, roomId, currentUserId, members, activities }: Props) {
  useEffect(() => {
    if (!open) return
    const unread = activities.filter(a => !a.readBy?.[currentUserId])
    if (unread.length === 0) return
    const batch = writeBatch(db)
    for (const a of unread) {
      batch.update(fsDoc(activitiesCol(roomId), a.id), {
        [`readBy.${currentUserId}`]: true,
      })
    }
    batch.commit().catch(() => { /* silent */ })
  }, [open, activities, roomId, currentUserId])

  return (
    <BottomSheet open={open} onClose={onClose} title="🔔 Hoạt động gần đây">
      {activities.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-8">Chưa có hoạt động nào</p>
      ) : (
        <div className="space-y-2">
          {activities.map(a => (
            <ActivityItem
              key={a.id}
              activity={a}
              members={members}
              isUnread={!a.readBy?.[currentUserId]}
            />
          ))}
        </div>
      )}
    </BottomSheet>
  )
}
