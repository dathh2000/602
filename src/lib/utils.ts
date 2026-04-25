export const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date)

export function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export function daysUntilDue(dueDay: number): number {
  const now = new Date()
  const due = new Date(now.getFullYear(), now.getMonth(), dueDay)
  if (due < now) due.setMonth(due.getMonth() + 1)
  return Math.ceil((due.getTime() - now.getTime()) / 86400000)
}
