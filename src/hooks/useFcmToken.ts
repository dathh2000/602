'use client'
import { useEffect } from 'react'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { membersCol } from '@/src/lib/firebase/collections'
import { requestFcmToken, onForegroundMessage } from '@/src/lib/firebase/messaging'
import toast from 'react-hot-toast'

export function useFcmToken(roomId: string | undefined, userId: string | undefined) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    if (!roomId || !userId) return
    if (Notification.permission === 'denied') return

    let unsub: (() => void) | null = null

    ;(async () => {
      // requestFcmToken() tự xin permission nếu trạng thái là 'default'
      const token = await requestFcmToken()
      if (token) {
        try {
          await updateDoc(doc(membersCol(roomId), userId), { fcmTokens: arrayUnion(token) })
        } catch { /* silent */ }
        unsub = await onForegroundMessage((payload) => {
          const title = payload.data?.title
          const body  = payload.data?.body
          if (title) toast(`${title}${body ? ' — ' + body : ''}`, { icon: '🔔', duration: 4000 })
        })
      }
    })()

    return () => { if (unsub) unsub() }
  }, [roomId, userId])
}
