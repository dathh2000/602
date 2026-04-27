'use client'
import { getMessaging, getToken, onMessage, isSupported, type Messaging } from 'firebase/messaging'
import { initializeApp, getApps } from 'firebase/app'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'placeholder',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'placeholder.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'placeholder',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'placeholder.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:000000000000:web:placeholder',
}

let cachedMessaging: Messaging | null = null

async function getOrInitMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null
  if (cachedMessaging) return cachedMessaging
  if (!(await isSupported())) return null
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
  cachedMessaging = getMessaging(app)
  return cachedMessaging
}

export async function requestFcmToken(): Promise<string | null> {
  const messaging = await getOrInitMessaging()
  if (!messaging) return null

  if (Notification.permission === 'denied') return null
  if (Notification.permission === 'default') {
    const result = await Notification.requestPermission()
    if (result !== 'granted') return null
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  if (!vapidKey) {
    console.warn('NEXT_PUBLIC_FIREBASE_VAPID_KEY not set')
    return null
  }

  try {
    // Register SW manually then wait until it's ACTIVE before calling getToken.
    // Without waiting, push subscription fails with "no active Service Worker".
    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    })
    await waitUntilActive(swReg)
    return await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg })
  } catch (err) {
    console.warn('FCM getToken failed', err)
    return null
  }
}

function waitUntilActive(reg: ServiceWorkerRegistration): Promise<void> {
  if (reg.active) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const sw = reg.installing || reg.waiting
    if (!sw) { resolve(); return }
    sw.addEventListener('statechange', () => {
      if (sw.state === 'activated') resolve()
    })
  })
}

export async function onForegroundMessage(handler: (payload: { notification?: { title?: string; body?: string }; data?: Record<string, string> }) => void): Promise<() => void> {
  const messaging = await getOrInitMessaging()
  if (!messaging) return () => {}
  return onMessage(messaging, handler)
}
