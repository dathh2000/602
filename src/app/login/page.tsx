'use client'
import { useState } from 'react'
import { useAuth } from '@/src/hooks/useAuth'

export default function LoginPage() {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)

  async function handleGoogle() {
    setLoading(true)
    await signInWithGoogle() // redirects away, loading stays true
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-amber-400 to-red-500 p-8 gap-6">
      <div className="text-6xl">🏠</div>
      <h1 className="text-white text-2xl font-extrabold text-center">Quản lý<br/>phòng trọ</h1>
      <p className="text-white/80 text-sm text-center">Chia sẻ chi phí dễ dàng với bạn cùng phòng</p>
      <div className="bg-white rounded-2xl p-4 w-full max-w-sm space-y-3">
        <button onClick={handleGoogle} disabled={loading}
          className="flex items-center justify-center gap-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl py-3 font-bold text-sm w-full disabled:opacity-50 shadow-sm">
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.7-6.7C35.8 2.4 30.3 0 24 0 14.7 0 6.7 5.4 2.8 13.3l7.8 6C12.5 13 17.8 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17z"/>
            <path fill="#FBBC05" d="M10.6 28.7A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.5 10.8l8.1-6.1z"/>
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.2 0-11.5-4.2-13.4-9.9l-8.1 6.1C6.7 42.6 14.7 48 24 48z"/>
          </svg>
          {loading ? 'Đang chuyển hướng...' : 'Đăng nhập bằng Google'}
        </button>
        <p className="text-center text-xs text-gray-400">Không cần tạo tài khoản mới</p>
      </div>
    </div>
  )
}
