'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/',       icon: '🏠', label: 'Tổng quan' },
  { href: '/bills',  icon: '📅', label: 'Hóa đơn'  },
  { href: '/debts',  icon: '👥', label: 'Công nợ'  },
  { href: '/fund',   icon: '💰', label: 'Quỹ'      },
  { href: '/stats',  icon: '📊', label: 'Thống kê' },
]

export function BottomNav() {
  const pathname = usePathname()
  if (pathname === '/login' || pathname.startsWith('/room/')) return null
  return (
    // Pinned to viewport bottom rather than the end of a flex column. iOS PWA
    // standalone has a long-running quirk where `height: 100dvh` / 100% on
    // <body> can resolve short of the home-indicator zone, leaving a white gap
    // below the nav. `position: fixed` sidesteps body height entirely.
    <nav className="fixed bottom-0 left-0 right-0 bg-amber-50 border-t-2 border-amber-200 grid grid-cols-5 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {TABS.map(t => (
        <Link key={t.href} href={t.href}
          className={`flex flex-col items-center py-2 text-xs ${pathname === t.href ? 'text-amber-500 font-bold' : 'text-gray-400'}`}>
          <span className="text-base">{t.icon}</span>
          {t.label}
        </Link>
      ))}
    </nav>
  )
}
