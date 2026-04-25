// src/types/index.ts
export interface Member {
  id: string
  displayName: string
  avatarUrl: string
  zaloId?: string
  role: 'admin' | 'member'
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
}

export interface BillPayment {
  id: string
  paid: boolean
  paidAt: Date | null
  paidBy: string | null
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
