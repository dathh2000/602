'use client'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  addDoc,
  doc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/src/lib/firebase/config'
import { messagesCol } from '@/src/lib/firebase/collections'
import { useAuth } from '@/src/hooks/useAuth'
import { useRoom } from '@/src/hooks/useRoom'
import { useMessages } from '@/src/hooks/useMessages'
import { MessageBubble, DateDivider } from '@/src/components/chat/MessageBubble'
import { MessageInput } from '@/src/components/chat/MessageInput'
import { LoadingScreen } from '@/src/components/ui/LoadingScreen'
import { InfiniteScrollSentinel } from '@/src/components/ui/InfiniteScrollSentinel'
import { fireAppReady } from '@/src/components/ui/Splash'
import { auth } from '@/src/lib/firebase/config'
import { isSameDay } from 'date-fns'

export default function ChatPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { room, members, loading } = useRoom()
  const { messages, hasMore, loadMore, loaded } = useMessages(room?.id, user?.uid, 30)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  // Anchor used to keep the user's view fixed during load-more. `prevLength`
  // is the messages.length at the moment of capture — the preservation only
  // fires once the array actually GROWS (i.e. the loadMore snapshot landed).
  // Intermediate re-renders from mark-as-read updates leave the anchor intact.
  // While non-null it also blocks re-entrant load-more calls.
  const anchorRef = useRef<{ msgId: string; offsetTop: number; prevLength: number } | null>(null)
  // Mirror of `messages.length` kept in a ref so `handleLoadMore` can read the
  // current length without listing `messages.length` as a useCallback dep
  // (which would recreate the handler every snapshot and rebuild the observer).
  const messagesLengthRef = useRef(0)
  messagesLengthRef.current = messages.length
  // Gate the sentinel: don't render it until we've scrolled to the bottom on
  // first load — otherwise IntersectionObserver fires at mount and pulls a
  // page we don't need.
  const [initialScrolled, setInitialScrolled] = useState(false)

  const membersById = useMemo(() => {
    const map: Record<string, typeof members[0]> = {}
    members.forEach(m => { map[m.id] = m })
    return map
  }, [members])

  // Maps a message id → the readers (Members) whose "last seen" message this is.
  // Walks messages.length-1 → 0 (newest → oldest), placing each non-self reader
  // on the first (newest) message they appear in readBy. So each reader's
  // avatar sits on their most-recently-read message and moves forward as they
  // catch up — Messenger-style.
  const seenByMap = useMemo<Record<string, typeof members>>(() => {
    if (!user) return {}
    const out: Record<string, typeof members> = {}
    const placed = new Set<string>()
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]
      if (m.senderId !== user.uid) continue
      const here: typeof members = []
      for (const uid of Object.keys(m.readBy ?? {})) {
        if (uid === user.uid) continue
        if (placed.has(uid)) continue
        const member = membersById[uid]
        if (!member) continue
        here.push(member)
        placed.add(uid)
      }
      if (here.length > 0) out[m.id] = here
    }
    return out
  }, [messages, membersById, user])

  useEffect(() => {
    if (!loading && (!room || loaded)) fireAppReady()
  }, [loading, room, loaded])

  // Scroll-position management. Runs BEFORE paint (useLayoutEffect) so the
  // user never sees the intermediate state where older messages have rendered
  // at the top but scrollTop hasn't been adjusted.
  //   - First snapshot ever                          → jump to bottom
  //   - Load-more snapshot (anchor set AND grew)     → re-pin anchor to its previous offset
  //   - Anchor set but messages didn't grow yet      → wait (readBy/mark-as-read update); keep anchor
  //   - No anchor + newest changed                   → smooth-scroll to bottom (new arrival)
  useLayoutEffect(() => {
    if (messages.length === 0) return
    const el = scrollRef.current
    if (!el) return
    const newest = messages[messages.length - 1]

    if (anchorRef.current) {
      if (messages.length > anchorRef.current.prevLength) {
        const { msgId, offsetTop } = anchorRef.current
        anchorRef.current = null
        const anchorEl = el.querySelector<HTMLElement>(`[data-msg-id="${msgId}"]`)
        if (anchorEl) {
          const containerTop = el.getBoundingClientRect().top
          const currentOffset = anchorEl.getBoundingClientRect().top - containerTop
          el.scrollTop += currentOffset - offsetTop
        }
      }
      // else: same-length update (mark-as-read snapshot). Keep anchor for the
      // real load-more snapshot still in flight.
    } else if (lastMessageIdRef.current === null) {
      el.scrollTop = el.scrollHeight
      setInitialScrolled(true)
    } else if (newest.id !== lastMessageIdRef.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
    lastMessageIdRef.current = newest.id
  }, [messages])

  const handleLoadMore = useCallback(() => {
    if (anchorRef.current) return // load already in flight
    const el = scrollRef.current
    if (!el) return
    // Anchor = first message whose bottom is inside the viewport.
    const containerTop = el.getBoundingClientRect().top
    const msgEls = el.querySelectorAll<HTMLElement>('[data-msg-id]')
    for (const msgEl of msgEls) {
      const rect = msgEl.getBoundingClientRect()
      if (rect.bottom > containerTop) {
        anchorRef.current = {
          msgId: msgEl.dataset.msgId!,
          offsetTop: rect.top - containerTop,
          prevLength: messagesLengthRef.current,
        }
        break
      }
    }
    loadMore()
  }, [loadMore])

  // Mark unread messages as read whenever the user is viewing chat
  useEffect(() => {
    if (!room || !user) return
    const unread = messages.filter(m => m.senderId !== user.uid && !m.readBy?.[user.uid])
    if (unread.length === 0) return
    const batch = writeBatch(db)
    unread.forEach(m => {
      batch.update(doc(messagesCol(room.id), m.id), {
        [`readBy.${user.uid}`]: serverTimestamp(),
      })
    })
    batch.commit().catch(err => console.warn('[chat] mark-read failed', err))
  }, [messages, room, user])

  async function handleSend(text: string, imageUrls: string[]) {
    if (!room || !user) return
    const data: Record<string, unknown> = {
      senderId: user.uid,
      text,
      createdAt: serverTimestamp(),
      readBy: { [user.uid]: serverTimestamp() },
    }
    if (imageUrls.length > 0) data.imageUrls = imageUrls

    await addDoc(messagesCol(room.id), data)

    // Fire-and-forget FCM push to other members
    void sendPush(room.id, text, imageUrls, user.uid).catch(err =>
      console.warn('[chat] push failed', err),
    )
  }

  if (loading) return <LoadingScreen />

  if (!room) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
      <div className="text-5xl">💬</div>
      <p className="text-amber-800 font-bold text-lg">Bạn chưa có phòng</p>
      <button onClick={() => router.push('/')}
        className="text-amber-600 underline text-sm">
        Về trang chính
      </button>
    </div>
  )

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header — full-bleed, safe-area top */}
      <div
        className="bg-gradient-to-r from-amber-400 to-red-500 text-white flex items-center gap-3 z-30 shrink-0"
        style={{ padding: 'calc(env(safe-area-inset-top) + 0.75rem) 1rem 0.75rem 1rem' }}
      >
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center text-xl active:bg-white/40 shrink-0">
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] opacity-80 leading-tight">💬 Chat phòng</p>
          <p className="font-bold text-base leading-tight truncate">{room.name}</p>
        </div>
        <p className="text-[10px] opacity-80 shrink-0">{members.length} thành viên</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1 bg-amber-50">
        {/* Lazy-load sentinel sits at the TOP. IntersectionObserver fires
            handleLoadMore when the user scrolls up to it; older messages
            prepend and the scroll-position effect above keeps the view stable. */}
        {messages.length > 0 && initialScrolled && (
          <InfiniteScrollSentinel hasMore={hasMore} onLoadMore={handleLoadMore} />
        )}
        {messages.length === 0 && loaded && (
          <div className="flex flex-col items-center justify-center text-center text-amber-600 text-sm py-12">
            <div className="text-4xl mb-2">👋</div>
            <p>Chưa có tin nhắn nào</p>
            <p className="text-xs opacity-70 mt-1">Gửi tin nhắn đầu tiên!</p>
          </div>
        )}
        {messages.map((m, i) => {
          const prev = i > 0 ? messages[i - 1] : null
          const showDate = !prev || !isSameDay(prev.createdAt, m.createdAt)
          const showSender = !prev || prev.senderId !== m.senderId || showDate
          return (
            <div key={m.id} data-msg-id={m.id}>
              {showDate && <DateDivider date={m.createdAt} />}
              <MessageBubble
                message={m}
                sender={membersById[m.senderId]}
                isMine={m.senderId === user?.uid}
                showSenderName={showSender}
                onImageClick={setPreviewImage}
                readers={seenByMap[m.id]}
              />
            </div>
          )
        })}
      </div>

      {/* Input */}
      <div className="shrink-0">
        <MessageInput onSend={handleSend} />
      </div>

      {/* Image preview overlay */}
      {previewImage && (
        <div onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <img src={previewImage} alt="" className="max-w-full max-h-full object-contain" />
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white text-xl">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

async function sendPush(roomId: string, text: string, imageUrls: string[], senderUid: string) {
  const u = auth.currentUser
  if (!u) return
  const idToken = await u.getIdToken()
  const senderName = u.displayName ?? 'Phòng trọ'
  const preview = text.trim()
    ? text.trim().slice(0, 100)
    : imageUrls.length > 0 ? `📷 Đã gửi ${imageUrls.length} ảnh` : ''
  if (!preview) return

  await fetch('/api/notifications/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      roomId,
      title: senderName,
      body: preview,
      link: '/chat',
      excludeUserId: senderUid,
    }),
  })
}

