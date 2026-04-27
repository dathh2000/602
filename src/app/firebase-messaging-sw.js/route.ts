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

const SW_JS = `/* Auto-generated FCM service worker */
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js')

firebase.initializeApp(${JSON.stringify(cfg)})
const messaging = firebase.messaging()

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'Phòng trọ'
  const body  = (payload.notification && payload.notification.body)  || ''
  const link  = (payload.data && payload.data.link) || '/'
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { link },
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
