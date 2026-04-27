'use client'
import { useState } from 'react'
import { ActivityFeedSheet } from '@/src/components/activity/ActivityFeedSheet'
import type { Activity, Member } from '@/src/types'

interface Props {
  roomId: string
  currentUserId: string
  members: Member[]
  activities: Activity[]
  unreadCount: number
}

export function ActivityBell({ roomId, currentUserId, members, activities, unreadCount }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="relative w-10 h-10 rounded-full bg-white/25 flex items-center justify-center text-lg active:bg-white/40">
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-amber-400">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <ActivityFeedSheet
          open={open}
          onClose={() => setOpen(false)}
          roomId={roomId}
          currentUserId={currentUserId}
          members={members}
          activities={activities}
        />
      )}
    </>
  )
}
