import { addDoc, serverTimestamp } from 'firebase/firestore'
import { auth } from '@/src/lib/firebase/config'
import { activitiesCol } from '@/src/lib/firebase/collections'
import type { ActivityType, ActivityMeta } from '@/src/types'

interface LogActivityInput {
  type: ActivityType
  actorId: string | null
  title: string
  body: string
  meta?: ActivityMeta
  link?: string
}

export async function logActivity(roomId: string, input: LogActivityInput): Promise<void> {
  await addDoc(activitiesCol(roomId), {
    type: input.type,
    actorId: input.actorId,
    title: input.title,
    body: input.body,
    meta: input.meta ?? {},
    readBy: input.actorId ? { [input.actorId]: true } : {},
    createdAt: serverTimestamp(),
  })

  // Fire-and-forget push notification (best-effort)
  void sendPush(roomId, input).catch(err => console.warn('[push] failed:', err))
}

async function sendPush(roomId: string, input: LogActivityInput): Promise<void> {
  if (typeof window === 'undefined') return
  const user = auth.currentUser
  if (!user) { console.warn('[push] no auth user'); return }
  const token = await user.getIdToken()
  const res = await fetch('/api/notifications/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      roomId,
      title: input.title,
      body: input.body,
      link: input.link ?? '/',
      excludeUserId: input.actorId ?? undefined,
    }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    console.warn('[push] endpoint error', res.status, json)
  } else {
    console.log('[push] sent', json)
  }
}
