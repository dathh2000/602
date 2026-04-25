'use client'
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithCustomToken, signOut as firebaseSignOut, User } from 'firebase/auth'
import { auth } from '@/src/lib/firebase/config'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false) })
  }, [])

  async function signInWithToken(token: string) {
    await signInWithCustomToken(auth, token)
  }

  async function signOut() {
    await firebaseSignOut(auth)
  }

  return { user, loading, signInWithToken, signOut }
}
