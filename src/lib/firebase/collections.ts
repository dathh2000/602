import { collection, doc } from 'firebase/firestore'
import { db } from './config'

export const roomsCol = () => collection(db, 'rooms')
export const roomDoc = (roomId: string) => doc(db, 'rooms', roomId)
export const membersCol = (roomId: string) => collection(db, 'rooms', roomId, 'members')
export const expensesCol = (roomId: string) => collection(db, 'rooms', roomId, 'expenses')
export const billsCol = (roomId: string) => collection(db, 'rooms', roomId, 'bills')
export const billPaymentsCol = (roomId: string, billId: string) => collection(db, 'rooms', roomId, 'bills', billId, 'payments')
export const fundDoc = (roomId: string) => doc(db, 'rooms', roomId, 'fund', 'data')
export const fundTxCol = (roomId: string) => collection(db, 'rooms', roomId, 'fund', 'data', 'transactions')
