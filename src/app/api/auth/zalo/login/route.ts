import { NextResponse } from 'next/server'
import { buildZaloAuthUrl } from '@/src/lib/zalo/oauth'
import { generateInviteCode } from '@/src/lib/utils'

export function GET() {
  const state = generateInviteCode()
  const url = buildZaloAuthUrl(state)
  const response = NextResponse.redirect(url)
  response.cookies.set('zalo_state', state, { httpOnly: true, maxAge: 600 })
  return response
}
