'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { roomsCol, membersCol } from '@/src/lib/firebase/collections'
import { generateInviteCode } from '@/src/lib/utils'
import { useAuth } from '@/src/hooks/useAuth'

export default function CreateRoomPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!user || !name.trim()) return
    setLoading(true)
    try {
      const roomRef = await addDoc(roomsCol(), {
        name: name.trim(),
        inviteCode: generateInviteCode(),
        createdAt: serverTimestamp(),
        memberIds: { [user.uid]: true },
      })
      await setDoc(doc(membersCol(roomRef.id), user.uid), {
        displayName: user.displayName ?? 'Thành viên',
        avatarUrl: user.photoURL ?? '',
        zaloId: user.uid.replace('zalo_', ''),
      })
      router.push('/')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6 gap-4">
      <h1 className="text-2xl font-extrabold text-amber-800">🏠 Tạo phòng mới</h1>
      <input value={name} onChange={e => setName(e.target.value)}
        placeholder="Tên phòng (VD: Phòng 302)"
        className="w-full max-w-sm border-2 border-amber-300 rounded-xl px-4 py-3 bg-amber-50 text-sm" />
      <button onClick={handleCreate} disabled={loading || !name.trim()}
        className="w-full max-w-sm bg-gradient-to-r from-amber-400 to-red-500 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50">
        {loading ? 'Đang tạo...' : 'Tạo phòng'}
      </button>
      <a href="/room/join" className="text-amber-600 text-sm underline">Đã có mã mời? Nhập vào đây</a>
    </div>
  )
}
