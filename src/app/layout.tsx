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
  appleWebApp: {
    capable: true,
    title: 'Phòng trọ',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f59e0b',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Height handled in globals.css (100% fallback + 100dvh). Setting inline
    // `height: 100%` here previously overrode the CSS rule and broke iOS PWA
    // viewport sizing → bottom-nav floated above the home indicator with a gap.
    <html lang="vi">
      <head>
        <meta name="zalo-platform-site-verification" content="JVIt8AlzE2rrxxTpZDqNHLdGW4-rfbKLCJ8s" />
      </head>
      <body className={`${inter.className} bg-amber-50`}
        style={{ display: 'flex', flexDirection: 'column' }}>
        <div id="scroll-root" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as const }}>
          <Providers>{children}</Providers>
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
