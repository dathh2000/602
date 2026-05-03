import { customAlphabet } from 'nanoid'
const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6)

export const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

/** Format compact: 5.2tr / 200k / 999đ — dùng cho stats khi chỗ hẹp */
export function formatVNDShort(amount: number): string {
  const sign = amount < 0 ? '-' : ''
  const a = Math.abs(amount)
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toFixed(a >= 10_000_000 ? 0 : 1)}tr`
  if (a >= 1_000) return `${sign}${Math.round(a / 1_000)}k`
  return `${sign}${a}đ`
}

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date)

export function generateInviteCode(): string {
  return nanoid()
}

export function formatAmountInput(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  return parseInt(digits, 10).toLocaleString('vi-VN')
}

export function parseAmountInput(value: string): number {
  return parseInt(value.replace(/\./g, ''), 10) || 0
}

export function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function daysUntilDue(dueDay: number): number {
  const now = new Date()
  const due = new Date(now.getFullYear(), now.getMonth(), dueDay)
  if (due < now) due.setMonth(due.getMonth() + 1)
  return Math.ceil((due.getTime() - now.getTime()) / 86400000)
}

/**
 * Trả về danh sách ảnh, ưu tiên `imageUrls` (mới), fallback `imageUrl` (legacy đơn).
 */
export function getImages(item: { imageUrl?: string; imageUrls?: string[] }): string[] {
  if (item.imageUrls && item.imageUrls.length > 0) return item.imageUrls
  if (item.imageUrl) return [item.imageUrl]
  return []
}

export function formatRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'vừa xong'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} phút trước`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} giờ trước`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} ngày trước`
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date)
}
