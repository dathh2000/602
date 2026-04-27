'use client'
import { useEffect } from 'react'
import { writeBatch, doc as fsDoc } from 'firebase/firestore'
import { db } from '@/src/lib/firebase/config'
import { activitiesCol } from '@/src/lib/firebase/collections'
import { ActivityItem } from '@/src/components/activity/ActivityItem'
import { InfiniteScrollSentinel } from '@/src/components/ui/InfiniteScrollSentinel'
import type { Activity, Member } from '@/src/types'

interface Props {
  open: boolean
  onClose: () => void
  roomId: string
  currentUserId: string
  members: Member[]
  activities: Activity[]
  hasMore: boolean
  onLoadMore: () => void
}

export function ActivityFeedSheet({ open, onClose, roomId, currentUserId, members, activities, hasMore, onLoadMore }: Props) {
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

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-b-2xl shadow-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-amber-100 sticky top-0 bg-white rounded-b-none">
          <h2 className="text-base font-extrabold text-amber-800">🔔 Hoạt động gần đây</h2>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-sm font-bold active:bg-amber-200">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {activities.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Chưa có hoạt động nào</p>
          ) : (
            <>
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
              <InfiniteScrollSentinel hasMore={hasMore} onLoadMore={onLoadMore} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
