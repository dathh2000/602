'use client'
import { useState } from 'react'
import { BottomSheet } from '@/src/components/ui/BottomSheet'
import { logActivity } from '@/src/lib/activity'
import type { Member } from '@/src/types'
import toast from 'react-hot-toast'

interface Props {
  open: boolean
  onClose: () => void
  roomId: string
  currentUserId: string
  members: Member[]
}

export function AnnouncementSheet({ open, onClose, roomId, currentUserId, members }: Props) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  function handleClose() {
    setText('')
    onClose()
  }

  async function handleSend() {
    const msg = text.trim()
    if (!msg) { toast.error('Nhập nội dung thông báo'); return }
    setSaving(true)
    try {
      const sender = members.find(m => m.id === currentUserId)
      await logActivity(roomId, {
        type: 'announcement',
        actorId: currentUserId,
        title: `📢 ${sender?.displayName ?? 'Có người'} gửi thông báo`,
        body: msg,
      })
      toast.success('Đã gửi thông báo!')
      handleClose()
    } catch {
      toast.error('Có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={handleClose} title="📢 Thông báo nhóm">
      <label className="text-xs text-amber-700 font-semibold">NỘI DUNG</label>
      <textarea value={text} onChange={e => setText(e.target.value)}
        placeholder="Hôm nay nhớ đổ rác nhé ae..."
        rows={4}
        className="w-full border-2 border-amber-200 rounded-xl px-3 py-2 text-sm bg-yellow-50 mt-1 mb-4 resize-none" />

      <button onClick={handleSend} disabled={saving}
        className="w-full bg-gradient-to-r from-amber-400 to-red-500 text-white rounded-xl py-3 font-bold text-sm disabled:opacity-50">
        {saving ? 'Đang gửi...' : 'Gửi thông báo'}
      </button>
    </BottomSheet>
  )
}
