'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { messagesCol } from '@/src/lib/firebase/collections'
import type { Message } from '@/src/types'

const DEFAULT_PAGE = 30

// Mirrors the useActivities pattern: query DESC with a growing `limit` for
// "load older" infinite scroll, but the consumer reverses the array so the
// newest message is rendered at the bottom of the chat thread.
export function useMessages(
  roomId: string | undefined,
  currentUserId: string | undefined,
  pageSize: number = DEFAULT_PAGE,
) {
  const [messages, setMessages] = useState<Message[]>([])
  const [pageLimit, setPageLimit] = useState(pageSize)
  const [hasMore, setHasMore] = useState(true)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!roomId) return
    const q = query(messagesCol(roomId), orderBy('createdAt', 'desc'), limit(pageLimit))
    // `includeMetadataChanges: true` makes onSnapshot re-fire when a doc
    // transitions from hasPendingWrites=true → false (server confirmation),
    // so the UI can flip a message from "Sending" to "Sent" without us
    // managing optimistic state by hand.
    return onSnapshot(q, { includeMetadataChanges: true }, snap => {
      const rows: Message[] = snap.docs.map(d => {
        const data = d.data()
        const readByRaw = (data.readBy as Record<string, { toDate?: () => Date }>) ?? {}
        const readBy: Record<string, Date> = {}
        for (const [uid, ts] of Object.entries(readByRaw)) {
          readBy[uid] = ts?.toDate?.() ?? new Date()
        }
        return {
          id: d.id,
          senderId: data.senderId,
          text: data.text ?? '',
          imageUrls: data.imageUrls,
          createdAt: data.createdAt?.toDate?.() ?? new Date(),
          readBy,
          isPending: d.metadata.hasPendingWrites,
        }
      })
      // Reverse → oldest first, newest at the bottom (chat order)
      setMessages(rows.reverse())
      // Gate hasMore on server-confirmed snapshots only — a cache fire with
      // fewer-than-pageLimit rows on initial load would otherwise show "— Hết —"
      // briefly before the server reply arrives.
      if (!snap.metadata.fromCache) {
        setHasMore(snap.size === pageLimit)
        setLoaded(true)
      }
    })
  }, [roomId, pageLimit])

  const unreadCount = useMemo(() => {
    if (!currentUserId) return 0
    return messages.filter(m => m.senderId !== currentUserId && !m.readBy?.[currentUserId]).length
  }, [messages, currentUserId])

  const loadMore = useCallback(() => {
    setPageLimit(p => p + pageSize)
  }, [pageSize])

  return { messages, unreadCount, hasMore, loadMore, loaded }
}
