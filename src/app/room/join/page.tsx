'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { query, where, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore'
import { roomsCol, membersCol } from '@/src/lib/firebase/collections'
import { useAuth } from '@/src/hooks/useAuth'
import toast from 'react-hot-toast'

export default function JoinRoomPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin() {
    if (!user || !code.trim()) return
    setLoading(true)
    try {
      const q = query(roomsCol(), where('inviteCode', '==', code.trim().toUpperCase()))
      const snap = await getDocs(q)
      if (snap.empty) { toast.error('Mã mời không hợp lệ'); return }
      const roomId = snap.docs[0].id
      await setDoc(doc(membersCol(roomId), user.uid), {
        displayName: user.displayName ?? 'Thành viên',
        avatarUrl: user.photoURL ?? '',
        zaloId: user.uid.replace('zalo_', ''),
      })
      await updateDoc(snap.docs[0].ref, { [`memberIds.${user.uid}`]: true })
      router.push('/')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6 gap-4">
      <h1 className="text-2xl font-extrabold text-amber-800">🔑 Nhập mã mời</h1>
      <input value={code} onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="VD: AB12CD" maxLength={6}
        className="w-full max-w-sm border-2 border-amber-300 rounded-xl px-4 py-3 bg-amber-50 text-sm text-center text-xl tracking-widest font-bold" />
      <button onClick={handleJoin} disabled={loading || code.length < 6}
        className="w-full max-w-sm bg-gradient-to-r from-amber-400 to-red-500 text-white rounded-xl py-3 font-bold disabled:opacity-50">
        {loading ? 'Đang tham gia...' : 'Tham gia phòng'}
      </button>
    </div>
  )
}
