'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/src/lib/firebase/config'
import { useAuth } from '@/src/hooks/useAuth'
import { useRoom } from '@/src/hooks/useRoom'
import { useExpenses } from '@/src/hooks/useExpenses'
import { useFund } from '@/src/hooks/useFund'
import { LoadingScreen } from '@/src/components/ui/LoadingScreen'
import { formatVND } from '@/src/lib/utils'
import { getShare } from '@/src/lib/expense'
import toast from 'react-hot-toast'

const COLORS = ['bg-amber-400', 'bg-blue-400', 'bg-purple-400', 'bg-green-400', 'bg-red-400']

export default function MembersPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { room, members, loading } = useRoom()
  const { expenses } = useExpenses(room?.id)
  const { fund, transactions } = useFund(room?.id)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading) return <LoadingScreen />

  const myIndex = members.findIndex(m => m.id === user?.uid)
  const me = members.find(m => m.id === user?.uid)

  // Per-member stats
  const memberStats = members.map(m => {
    const paid = expenses
      .filter(e => e.paidBy === m.id && !e.paidFromFund)
      .reduce((s, e) => s + e.amount, 0)
    const owed = expenses
      .filter(e => !e.paidFromFund && e.participants.includes(m.id) && !e.settlements[m.id]?.paid && e.paidBy !== m.id)
      .reduce((s, e) => s + getShare(e, m.id), 0)
    const deposited = transactions
      .filter(t => t.type === 'deposit' && t.userId === m.id)
      .reduce((s, t) => s + t.amount, 0)
    return { member: m, paid, owed, deposited }
  })

  async function handleSaveName() {
    if (!newName.trim() || !user || !room) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'rooms', room.id, 'members', user.uid), {
        displayName: newName.trim(),
      })
      toast.success('Đã cập nhật tên!')
      setEditingName(false)
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="p-4 space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-lg">
          ‹
        </button>
        <h1 className="text-base font-extrabold text-amber-800">Thành viên phòng</h1>
      </div>

      {/* Current user card */}
      {me && (
        <div className="bg-gradient-to-r from-amber-400 to-red-500 rounded-2xl p-4 text-white">
          <p className="text-xs opacity-80 mb-3">👤 Thông tin của bạn</p>
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 ${COLORS[myIndex % COLORS.length]} rounded-full flex items-center justify-center text-white text-xl font-extrabold border-2 border-white/50`}>
              {me.displayName[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="flex-1 rounded-xl px-3 py-1.5 text-sm text-gray-800 bg-white"
                    placeholder={me.displayName}
                    autoFocus
                  />
                  <button onClick={handleSaveName} disabled={saving}
                    className="bg-white/25 px-3 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50">
                    {saving ? '...' : 'Lưu'}
                  </button>
                  <button onClick={() => setEditingName(false)}
                    className="bg-white/15 px-2 py-1.5 rounded-xl text-xs">
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="font-extrabold text-lg">{me.displayName}</p>
                  <button onClick={() => { setNewName(me.displayName); setEditingName(true) }}
                    className="bg-white/20 px-2 py-0.5 rounded-lg text-xs">
                    ✏️
                  </button>
                </div>
              )}
              <p className="text-xs opacity-75 mt-0.5">{room?.name}</p>
            </div>
          </div>

          {/* My stats */}
          {(() => {
            const myStat = memberStats.find(s => s.member.id === user?.uid)
            return myStat ? (
              <div className="grid grid-cols-3 gap-2 mt-4">
                <div className="bg-white/20 rounded-xl p-2 text-center">
                  <p className="text-xs opacity-75">Đã chi</p>
                  <p className="font-bold text-sm">{formatVND(myStat.paid)}</p>
                </div>
                <div className="bg-white/20 rounded-xl p-2 text-center">
                  <p className="text-xs opacity-75">Còn nợ</p>
                  <p className="font-bold text-sm">{formatVND(myStat.owed)}</p>
                </div>
                <div className="bg-white/20 rounded-xl p-2 text-center">
                  <p className="text-xs opacity-75">Nạp quỹ</p>
                  <p className="font-bold text-sm">{formatVND(myStat.deposited)}</p>
                </div>
              </div>
            ) : null
          })()}
        </div>
      )}

      {/* Room info */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
        <p className="text-xs text-amber-700 font-bold uppercase mb-1">Thông tin phòng</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tên phòng</span>
          <span className="font-semibold">{room?.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Mã mời</span>
          <span className="font-bold tracking-widest text-amber-600">{room?.inviteCode}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Số thành viên</span>
          <span className="font-semibold">{members.length} người</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Số dư quỹ</span>
          <span className="font-semibold text-green-600">{formatVND(fund.balance)}</span>
        </div>
      </div>

      {/* All members */}
      <div>
        <p className="text-xs text-amber-700 font-bold uppercase mb-2">Các thành viên</p>
        <div className="space-y-2">
          {memberStats.map(({ member, paid, owed, deposited }, i) => (
            <div key={member.id} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
              <div className={`w-10 h-10 ${COLORS[i % COLORS.length]} rounded-full flex items-center justify-center text-white font-extrabold text-base shrink-0`}>
                {member.displayName[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-bold text-sm text-gray-800 truncate">{member.displayName}</p>
                  {member.id === user?.uid && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Bạn</span>
                  )}
                </div>
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-gray-400">Chi: <span className="text-gray-600 font-medium">{formatVND(paid)}</span></span>
                  <span className="text-xs text-gray-400">Nợ: <span className="text-red-500 font-medium">{formatVND(owed)}</span></span>
                </div>
              </div>
              {deposited > 0 && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Nạp quỹ</p>
                  <p className="text-xs font-semibold text-green-600">+{formatVND(deposited)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
