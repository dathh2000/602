'use client'
import { useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { BottomSheet } from '@/src/components/ui/BottomSheet'
import { useAuth } from '@/src/hooks/useAuth'
import { buildMyDebtRows } from '@/src/lib/debt-detail'
import { formatVND } from '@/src/lib/utils'
import { saveOrShareImage } from '@/src/lib/saveImage'
import type { Expense, Member } from '@/src/types'

interface Props {
  open: boolean
  onClose: () => void
  expenses: Expense[]
  members: Member[]
  roomName: string
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}

function slug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip combining diacritics (đạt → dat)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'report'
}

export function DebtSummarySheet({ open, onClose, expenses, members, roomName }: Props) {
  const { user } = useAuth()
  const captureRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  const userDisplayName = useMemo(() => {
    if (!user) return ''
    const m = members.find(x => x.id === user.uid)
    return m?.displayName ?? user.displayName ?? 'Bạn'
  }, [user, members])

  const rows = useMemo(() => {
    if (!user) return []
    return buildMyDebtRows(expenses, members, user.uid)
  }, [expenses, members, user])

  const total = useMemo(() => rows.reduce((s, r) => s + r.share, 0), [rows])

  async function handleSave() {
    if (!captureRef.current) return
    setSaving(true)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(captureRef.current, {
        pixelRatio: 2,
        backgroundColor: '#fffbeb',
        cacheBust: true,
      })
      const filename = `cong-no-${slug(userDisplayName)}-${format(new Date(), 'dd-MM-yyyy')}.png`
      const result = await saveOrShareImage(dataUrl, filename)
      if (result === 'shared') toast.success('Đã mở trình chia sẻ')
      else if (result === 'downloaded') toast.success('Đã tải ảnh')
      else toast('Mở ảnh — long-press để lưu', { icon: '💡' })
    } catch (err) {
      console.warn('save report failed', err)
      toast.error('Không lưu được ảnh')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Tổng hợp công nợ">
      <div className="space-y-3">
        {rows.length > 0 && (
          <p className="text-[10px] text-amber-700 text-center">
            ← Vuốt ngang để xem hết · ảnh lưu sẽ chứa đầy đủ →
          </p>
        )}

        {/* Horizontal scroll wrapper: lets user pan the table on phone.
            captureRef is INSIDE so html-to-image captures the full natural
            width (560px+), not just the visible portion. */}
        <div className="overflow-x-auto -mx-4 px-4">
          {/* Capturable area — keep buttons OUT of this div */}
          <div ref={captureRef} className="bg-amber-50 rounded-xl p-4 space-y-3"
            style={{ minWidth: rows.length > 0 ? '560px' : undefined }}>
            {/* Title block */}
            <div className="space-y-0.5">
              <p className="text-base font-extrabold text-amber-800">Công nợ của {userDisplayName}</p>
              <p className="text-xs text-amber-700">
                Phòng {roomName} · Ngày in {format(new Date(), 'dd/MM/yyyy')}
              </p>
            </div>

            {rows.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center">
                <div className="text-3xl mb-2">🎉</div>
                <p className="text-amber-700 font-semibold">Bạn không nợ ai cả!</p>
              </div>
            ) : (
              <>
                {/* Table — explicit column widths so titles aren't squeezed to "tes…". */}
                <div className="bg-white rounded-lg border border-amber-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <colgroup>
                      <col style={{ width: '32px' }} />
                      <col style={{ width: '52px' }} />
                      <col />
                      <col style={{ width: '128px' }} />
                      <col style={{ width: '96px' }} />
                      <col style={{ width: '96px' }} />
                    </colgroup>
                    <thead className="bg-amber-100 text-amber-800">
                      <tr>
                        <th className="px-2 py-1.5 text-center font-bold border-b border-amber-200">#</th>
                        <th className="px-2 py-1.5 text-left font-bold border-b border-amber-200">Ngày</th>
                        <th className="px-2 py-1.5 text-left font-bold border-b border-amber-200">Tên khoản</th>
                        <th className="px-2 py-1.5 text-right font-bold border-b border-amber-200">Tổng ÷ N</th>
                        <th className="px-2 py-1.5 text-left font-bold border-b border-amber-200">Ai chi</th>
                        <th className="px-2 py-1.5 text-right font-bold border-b border-amber-200">Phần</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={r.expense.id} className={i % 2 === 0 ? 'bg-white' : 'bg-amber-50/50'}>
                          <td className="px-2 py-1 text-center text-gray-500 border-b border-amber-100">{i + 1}</td>
                          <td className="px-2 py-1 text-gray-600 border-b border-amber-100 whitespace-nowrap">{format(r.expense.date, 'dd/MM')}</td>
                          <td className="px-2 py-1 text-gray-800 border-b border-amber-100 truncate" title={r.expense.title}>{r.expense.title}</td>
                          <td className="px-2 py-1 text-right text-gray-600 border-b border-amber-100 whitespace-nowrap">
                            {formatVND(r.expense.amount)} ÷ {r.expense.participants.length}
                          </td>
                          <td className="px-2 py-1 text-gray-700 border-b border-amber-100 truncate" title={r.creditor?.displayName ?? '?'}>
                            {truncate(r.creditor?.displayName ?? '?', 12)}
                          </td>
                          <td className="px-2 py-1 text-right font-semibold text-red-500 border-b border-amber-100 whitespace-nowrap">
                            {formatVND(r.share)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Grand total */}
                <div className="bg-white rounded-lg px-3 py-2.5 flex justify-between items-center border-2 border-amber-300">
                  <span className="text-sm font-bold text-amber-800">Tổng cộng cần trả:</span>
                  <span className="text-base font-extrabold text-red-500">{formatVND(total)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Actions — OUTSIDE the capture area */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={onClose}
            className="py-2.5 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-500 active:bg-gray-50">
            Đóng
          </button>
          <button onClick={handleSave} disabled={saving}
            className="py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-red-500 text-white text-sm font-bold disabled:opacity-50">
            {saving ? '⏳ Đang xử lý...' : '💾 Lưu ảnh'}
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
