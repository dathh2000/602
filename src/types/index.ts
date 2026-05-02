// src/types/index.ts
export interface Member {
  id: string
  displayName: string
  avatarUrl: string
  zaloId?: string
  role: 'admin' | 'member'
  fcmTokens?: string[]
}

export type ActivityType =
  | 'expense.created'
  | 'expense.settled'
  | 'debt.settled'
  | 'bill.created'
  | 'bill.due'
  | 'bill.paid'
  | 'fund.deposit'
  | 'fund.withdraw'
  | 'announcement'

export interface ActivityMeta {
  expenseId?: string
  billId?: string
  txId?: string
  debtFrom?: string
  debtTo?: string
  amount?: number
}

export interface Activity {
  id: string
  type: ActivityType
  actorId: string | null
  title: string
  body: string
  meta: ActivityMeta
  readBy: Record<string, true>
  createdAt: Date
}

export type ExpenseCategory = 'food' | 'grocery' | 'transport' | 'repair' | 'other'
export type BillCategory = 'rent' | 'electric' | 'water' | 'internet' | 'other'
export type FundTxType = 'deposit' | 'withdraw'

export interface Settlement {
  paid: boolean
  paidAt: Date | null
}

export interface Expense {
  id: string
  title: string
  amount: number
  paidBy: string          // userId
  participants: string[]  // userIds
  category: ExpenseCategory
  date: Date
  paidFromFund: boolean
  createdAt: Date
  settlements: Record<string, Settlement>
  imageUrl?: string
  // true khi tất cả participant đã settled (hoặc paidFromFund). Maintained server-side
  // dùng để query bounded khi tính nợ. Có thể undefined cho doc cũ chưa migrate.
  allSettled?: boolean
  // Custom share per participant (uid -> amount). Nếu undefined → chia đều amount/participants.length.
  // Tổng các share phải bằng amount.
  shares?: Record<string, number>
}

export interface Bill {
  id: string
  title: string
  amount: number
  dueDay: number
  category: BillCategory
  notifyDaysBefore: number
  active: boolean
  imageUrl?: string
  // Bill là one-shot (không recurring). User tạo lại bill cho mỗi tháng.
  paid?: boolean
  paidAt?: Date | null
  paidBy?: string | null
}

export interface FundTransaction {
  id: string
  type: FundTxType
  amount: number
  userId: string
  note: string
  relatedExpenseId: string | null
  createdAt: Date
}

export interface Fund {
  balance: number
}

export interface Room {
  id: string
  name: string
  createdAt: Date
  inviteCode: string
}

export interface DebtEdge {
  from: string  // userId người nợ
  to: string    // userId người được nợ
  amount: number
}
