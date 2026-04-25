import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/src/lib/firebase/admin'
import { generateInviteCode } from '@/src/lib/utils'

// POST /api/room/invite — revoke old code and generate new one
export async function POST(req: NextRequest) {
  const { roomId, userId } = await req.json()
  if (!roomId || !userId) return NextResponse.json({ error: 'Missing roomId or userId' }, { status: 400 })

  const memberDoc = await adminDb.collection('rooms').doc(roomId).collection('members').doc(userId).get()
  if (!memberDoc.exists) return NextResponse.json({ error: 'Not a member' }, { status: 403 })

  const newCode = generateInviteCode()
  await adminDb.collection('rooms').doc(roomId).update({ inviteCode: newCode })
  return NextResponse.json({ inviteCode: newCode })
}
