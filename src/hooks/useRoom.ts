'use client'
import { useEffect, useState } from 'react'
import { onSnapshot, query, where } from 'firebase/firestore'
import { membersCol, roomsCol } from '@/src/lib/firebase/collections'
import { useAuth } from './useAuth'
import type { Room, Member } from '@/src/types'

export function useRoom() {
  const { user, loading: authLoading } = useAuth()
  const [room, setRoom] = useState<Room | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return // auth chưa xong, chờ
    if (!user) { setLoading(false); return }
    let unsubMembers: (() => void) | undefined
    const q = query(roomsCol(), where(`memberIds.${user.uid}`, '==', true))
    const unsub = onSnapshot(q, snap => {
      unsubMembers?.()
      if (snap.empty) { setRoom(null); setLoading(false); return }
      const docSnap = snap.docs[0]
      const data = docSnap.data()
      setRoom({ id: docSnap.id, name: data.name, createdAt: data.createdAt?.toDate(), inviteCode: data.inviteCode })
      unsubMembers = onSnapshot(membersCol(docSnap.id), mSnap => {
        setMembers(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member)))
        setLoading(false)
      })
    })
    return () => { unsub(); unsubMembers?.() }
  }, [user, authLoading])

  const isAdmin = user ? (members.find(m => m.id === user.uid)?.role === 'admin') : false
  return { room, members, loading, isAdmin }
}
