'use client'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAuth } from '@/src/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { updateProfile } from 'firebase/auth'
import { getDoc, doc } from 'firebase/firestore'
import { auth } from '@/src/lib/firebase/config'
import { db } from '@/src/lib/firebase/config'

function TokenHandler() {
  const { signInWithToken } = useAuth()
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    if (token) {
      signInWithToken(token).then(async () => {
        // Lấy tên Zalo từ Firestore và cập nhật Firebase Auth profile
        const currentUser = auth.currentUser
        if (currentUser && !currentUser.displayName) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid))
          if (userDoc.exists()) {
            const data = userDoc.data()
            await updateProfile(currentUser, {
              displayName: data.displayName ?? 'Thành viên',
              photoURL: data.avatarUrl ?? '',
            }).catch(console.error)
          }
        }
        router.replace('/')
      }).catch(console.error)
    }
  }, [params, signInWithToken, router])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <TokenHandler />
      </Suspense>
      {children}
      <Toaster position="top-center" />
    </>
  )
}
