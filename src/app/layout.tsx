import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { BottomNav } from '@/src/components/layout/BottomNav'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Phòng trọ',
  description: 'Quản lý chi tiêu phòng trọ.',
  manifest: '/manifest.json',
  icons: {
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <meta name="zalo-platform-site-verification" content="JVIt8AlzE2rrxxTpZDqNHLdGW4-rfbKLCJ8s" />
      </head>
      <body className={`${inter.className} bg-amber-50`} style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        <Providers>{children}</Providers>
        <BottomNav />
      </body>
    </html>
  )
}
