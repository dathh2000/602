import { NextRequest, NextResponse } from 'next/server'
import { exchangeZaloCode } from '@/src/lib/zalo/oauth'
import { adminAuth, adminDb } from '@/src/lib/firebase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const cookieState = req.cookies.get('zalo_state')?.value

  if (!code || state !== cookieState) {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=invalid_state`)
  }

  try {
    const zaloUser = await exchangeZaloCode(code)
    const uid = `zalo_${zaloUser.uid}`

    await adminDb.collection('users').doc(uid).set({
      displayName: zaloUser.name,
      avatarUrl: zaloUser.picture?.data?.url ?? '',
      zaloId: zaloUser.uid,
      updatedAt: new Date(),
    }, { merge: true })

    const customToken = await adminAuth.createCustomToken(uid, { zaloId: zaloUser.uid })
    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/?token=${customToken}`)
    response.cookies.delete('zalo_state')
    response.cookies.set('__session', uid, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    return response
  } catch {
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/login?error=auth_failed`)
  }
}
