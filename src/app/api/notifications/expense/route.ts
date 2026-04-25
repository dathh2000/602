import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/src/lib/firebase/admin'
import { notifyNewExpense } from '@/src/lib/zalo/notify'

export async function POST(req: NextRequest) {
  const { roomId, expenseTitle, amount, paidBy, participants } = await req.json()

  const membersSnap = await adminDb.collection('rooms').doc(roomId).collection('members').get()
  const members = Object.fromEntries(membersSnap.docs.map(d => [d.id, d.data()]))
  const paidByName = members[paidBy]?.displayName ?? 'Ai đó'
  const share = amount / participants.length

  const targets = participants.filter((uid: string) => uid !== paidBy)
  const zaloIds = targets.map((uid: string) => members[uid]?.zaloId).filter(Boolean) as string[]

  await notifyNewExpense(zaloIds, expenseTitle, amount, paidByName, share)
  return NextResponse.json({ ok: true })
}
