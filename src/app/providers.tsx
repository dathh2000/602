'use client'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { useAuth } from '@/src/hooks/useAuth'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function TokenHandler() {
  const { signInWithToken } = useAuth()
  const router = useRouter()
  const params = useSearchParams()

  useEffect(() => {
    const token = params.get('token')
    if (token) {
      signInWithToken(token).then(() => router.replace('/'))
    }
  }, [])

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
