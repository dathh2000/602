'use client'
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut as firebaseSignOut, GoogleAuthProvider, User } from 'firebase/auth'
import { auth } from '@/src/lib/firebase/config'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
      if (u) {
        document.cookie = `__session=${u.uid}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
      } else {
        document.cookie = '__session=; path=/; max-age=0'
      }
    })
  }, [])

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (err: unknown) {
      // Popup bị block → fallback sang redirect
      const code = (err as { code?: string })?.code
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        await signInWithRedirect(auth, provider)
      } else {
        throw err
      }
    }
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  return { user, loading, signInWithGoogle, signOut }
}
