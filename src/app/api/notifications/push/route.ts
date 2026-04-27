import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { adminAuth, adminDb } from '@/src/lib/firebase/admin'
import { sendPushMulticast } from '@/src/lib/firebase/fcm-raw'

interface PushBody {
  roomId: string
  title: string
  body: string
  link?: string
  excludeUserId?: string
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const idToken = authHeader.slice(7)
    const decoded = await adminAuth.verifyIdToken(idToken)
    const callerUid = decoded.uid

    const { roomId, title, body, link, excludeUserId } = (await req.json()) as PushBody
    if (!roomId || !title) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Verify caller is member of room
    const callerMember = await adminDb.collection('rooms').doc(roomId)
      .collection('members').doc(callerUid).get()
    if (!callerMember.exists) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 })
    }

    // Collect tất cả tokens (đa device per user — laptop + phone đều nhận)
    const membersSnap = await adminDb.collection('rooms').doc(roomId).collection('members').get()
    const tokensByMember: Record<string, string[]> = {}
    for (const m of membersSnap.docs) {
      if (excludeUserId && m.id === excludeUserId) continue
      const tokens = (m.data().fcmTokens as string[] | undefined) ?? []
      if (tokens.length > 0) tokensByMember[m.id] = tokens
    }

    const allTokens = Object.values(tokensByMember).flat()
    if (allTokens.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (!projectId) {
      return NextResponse.json({ error: 'No projectId' }, { status: 500 })
    }

    // Tag dedup tại OS: cùng device tích nhiều token → cả 2 push tới cùng device
    // → iOS dùng tag để replace cái sau, chỉ hiển thị 1
    const tag = `${title}|${body}`.slice(0, 100)

    const response = await sendPushMulticast(
      projectId,
      allTokens,
      { title, body },
      { link: link ?? '/', tag },
    )

    // Cleanup invalid tokens
    const failedTokens: string[] = []
    const failureSummary: { code?: string; message?: string }[] = []
    response.results.forEach(({ token, result }) => {
      if (!result.success) {
        failureSummary.push({ code: result.errorCode, message: result.errorMessage })
        if (result.errorCode === 'UNREGISTERED' ||
            result.errorCode === 'INVALID_ARGUMENT') {
          failedTokens.push(token)
        }
      }
    })
    if (failureSummary.length > 0) {
      console.warn('[push] failures:', JSON.stringify(failureSummary))
    }

    if (failedTokens.length > 0) {
      const cleanup: Promise<unknown>[] = []
      for (const [memberId, tokens] of Object.entries(tokensByMember)) {
        const bad = tokens.filter(t => failedTokens.includes(t))
        if (bad.length > 0) {
          cleanup.push(
            adminDb.collection('rooms').doc(roomId).collection('members').doc(memberId)
              .update({ fcmTokens: FieldValue.arrayRemove(...bad) })
          )
        }
      }
      await Promise.allSettled(cleanup)
    }

    return NextResponse.json({
      ok: true,
      sent: response.successCount,
      failed: response.failureCount,
    })
  } catch (e) {
    console.error('Push error:', e)
    return NextResponse.json({ error: 'Internal' }, { status: 500 })
  }
}
