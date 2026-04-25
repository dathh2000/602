import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/src/lib/firebase/admin'
import { notifyBillDue } from '@/src/lib/zalo/notify'

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const isLocalTest  = req.headers.get('x-cron-secret') === process.env.CRON_SECRET
  if (!isVercelCron && !isLocalTest) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const now = new Date()
  const roomsSnap = await adminDb.collection('rooms').get()
  let notified = 0

  for (const roomDoc of roomsSnap.docs) {
    const membersSnap = await roomDoc.ref.collection('members').get()
    const zaloIds = membersSnap.docs.map(d => d.data().zaloId).filter(Boolean) as string[]

    const billsSnap = await roomDoc.ref.collection('bills').where('active', '==', true).get()
    for (const billDoc of billsSnap.docs) {
      const bill = billDoc.data()
      const dueDay: number = bill.dueDay
      const notifyBefore: number = bill.notifyDaysBefore ?? 3

      const due = new Date(now.getFullYear(), now.getMonth(), dueDay)
      if (due < now) due.setMonth(due.getMonth() + 1)
      const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000)

      if (daysLeft <= notifyBefore) {
        await notifyBillDue(zaloIds, bill.title, daysLeft, bill.amount)
        notified++
      }
    }
  }

  return NextResponse.json({ ok: true, notified })
}
