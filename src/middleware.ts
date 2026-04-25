import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  // Firebase Auth persists session client-side; we use a simple cookie for SSR redirect
  const hasSession = req.cookies.has('__session')
  if (!isPublic && !hasSession) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next|favicon.ico|icons|manifest.json).*)'] }
