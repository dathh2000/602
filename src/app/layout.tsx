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
    // No statusBarStyle: lets iOS use its default (opaque) status bar tinted by
    // the manifest `theme_color` (#f59e0b orange) — visually merges with the
    // orange page header. `black-translucent` was the previous setting and
    // produced a cream gap above the header on fresh installs.
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
    <html lang="vi" style={{ height: '100%' }}>
      <head>
        <meta name="zalo-platform-site-verification" content="JVIt8AlzE2rrxxTpZDqNHLdGW4-rfbKLCJ8s" />
      </head>
      <body className={`${inter.className} bg-amber-50`}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div id="scroll-root" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' as const }}>
          <Providers>{children}</Providers>
        </div>
        <BottomNav />
      </body>
    </html>
  )
}
