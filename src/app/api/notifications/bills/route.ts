import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/src/lib/firebase/admin'
import { sendPushMulticast } from '@/src/lib/firebase/fcm-raw'

export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get('x-vercel-cron') === '1'
  const cronSecret = process.env.CRON_SECRET
  const isLocalTest = !!cronSecret && req.headers.get('x-cron-secret') === cronSecret
  if (!isVercelCron && !isLocalTest) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (!projectId) return NextResponse.json({ error: 'No projectId' }, { status: 500 })

  const now = new Date()
  const monthLabel = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`
  const roomsSnap = await adminDb.collection('rooms').get()
  let notified = 0

  for (const roomDoc of roomsSnap.docs) {
    try {
      const billsSnap = await roomDoc.ref.collection('bills').where('active', '==', true).get()

      const dueBills: Array<{ id: string; title: string; amount: number; daysLeft: number }> = []
      for (const billDoc of billsSnap.docs) {
        const bill = billDoc.data()
        if (bill.paid === true) continue // bỏ qua bill đã đóng
        const dueDay: number = bill.dueDay
        const notifyBefore: number = bill.notifyDaysBefore ?? 3

        const due = new Date(now.getFullYear(), now.getMonth(), dueDay)
        if (due < now) due.setMonth(due.getMonth() + 1)
        const daysLeft = Math.ceil((due.getTime() - now.getTime()) / 86400000)

        if (daysLeft <= notifyBefore) {
          dueBills.push({
            id: billDoc.id,
            title: bill.title,
            amount: bill.amount,
            daysLeft,
          })
        }
      }

      if (dueBills.length === 0) continue

      // Collect tokens của tất cả members (cron không loại trừ ai)
      const membersSnap = await roomDoc.ref.collection('members').get()
      const tokensByMember: Record<string, string[]> = {}
      for (const m of membersSnap.docs) {
        const tokens = (m.data().fcmTokens as string[] | undefined) ?? []
        if (tokens.length > 0) tokensByMember[m.id] = tokens
      }
      const allTokens = Object.values(tokensByMember).flat()

      for (const bill of dueBills) {
        const amountText = `${new Intl.NumberFormat('vi-VN').format(bill.amount)}₫`
        const title = `⏰ Hóa đơn sắp đến hạn: ${bill.title}`
        const body = bill.daysLeft <= 0
          ? `Hôm nay là hạn đóng · ${amountText}`
          : `Còn ${bill.daysLeft} ngày · ${amountText}`

        // 1) Activity log (in-app feed)
        await roomDoc.ref.collection('activities').add({
          type: 'bill.due',
          actorId: null,
          title,
          body,
          meta: { billId: bill.id, amount: bill.amount },
          readBy: {},
          createdAt: FieldValue.serverTimestamp(),
        })

        // 2) FCM push
        if (allTokens.length > 0) {
          try {
            await sendPushMulticast(
              projectId,
              allTokens,
              { title, body },
              { link: '/bills', tag: `bill-due-${bill.id}-${monthLabel}` },
            )
          } catch (err) {
            console.error(`FCM push failed for bill ${bill.id}:`, err)
          }
        }

        notified++
      }
    } catch (err) {
      console.error(`Error processing room ${roomDoc.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, notified })
}
