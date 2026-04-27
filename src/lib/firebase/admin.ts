import { initializeApp, getApps, cert, App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

function getAdminApp(): App {
  if (getApps().length) return getApps()[0]
  const projectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID must be set')
  }
  return initializeApp({
    projectId,
    credential: cert({
      projectId,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    }),
  })
}

export const adminAuth = new Proxy({} as ReturnType<typeof getAuth>, {
  get(_, prop) {
    return (getAuth(getAdminApp()) as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const adminDb = new Proxy({} as ReturnType<typeof getFirestore>, {
  get(_, prop) {
    return (getFirestore(getAdminApp()) as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export const adminMessaging = new Proxy({} as ReturnType<typeof getMessaging>, {
  get(_, prop) {
    return (getMessaging(getAdminApp()) as unknown as Record<string | symbol, unknown>)[prop]
  },
})
