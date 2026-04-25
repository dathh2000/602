'use client'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import { getRedirectResult } from 'firebase/auth'
import { auth } from '@/src/lib/firebase/config'
import { useRouter } from 'next/navigation'

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    getRedirectResult(auth).then((result) => {
      if (result) router.replace('/')
    }).catch(console.error)
  }, [router])

  return (
    <>
      {children}
      <Toaster position="top-center" />
    </>
  )
}
