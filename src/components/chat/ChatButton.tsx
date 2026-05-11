'use client'
import Link from 'next/link'
import { useMessages } from '@/src/hooks/useMessages'

interface Props {
  roomId: string
  currentUserId: string
}

// Lightweight wrapper: subscribes to the last page of messages just to surface
// an unread badge count. The same useMessages call inside /chat will re-mount
// fresh; both subscriptions are cheap (capped at pageSize docs).
export function ChatButton({ roomId, currentUserId }: Props) {
  const { unreadCount } = useMessages(roomId, currentUserId)

  return (
    <Link href="/chat"
      aria-label="Mở chat"
      className="relative w-10 h-10 rounded-full bg-white/25 flex items-center justify-center text-lg active:bg-white/40">
      💬
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-orange-500">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
