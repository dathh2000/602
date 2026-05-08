import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

const cfg = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
}

// Build marker rotates each module load → SW script bytes change → iOS detects
// new SW and activates the latest handler quickly instead of clinging to the cached one.
const SW_BUILD = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const SW_JS = `/* Auto-generated FCM service worker — build ${SW_BUILD} */
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js')

firebase.initializeApp(${JSON.stringify(cfg)})
const messaging = firebase.messaging()

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

// Returning the showNotification Promise is REQUIRED on iOS Web Push:
// Firebase forwards the return value to event.waitUntil(); without it the SW may
// terminate before iOS commits the notification → iOS shows a generic placeholder
// ("<App> from <origin>") with empty title/body.
messaging.onBackgroundMessage((payload) => {
  const data  = payload.data || {}
  const title = data.title || 'Phòng trọ'
  const body  = data.body  || ''
  const link  = data.link  || '/'
  const tag   = data.tag   || (title + '|' + body)
  return self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { link },
    tag,
    renotify: false,
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = (event.notification.data && event.notification.data.link) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          try { client.navigate(link) } catch (e) {}
          return client.focus()
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link)
    })
  )
})
`

export function GET() {
  return new NextResponse(SW_JS, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Service-Worker-Allowed': '/',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
