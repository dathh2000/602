'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/',       icon: '📊', label: 'Tổng quan' },
  { href: '/bills',  icon: '📅', label: 'Hóa đơn'  },
  { href: '/debts',  icon: '👥', label: 'Công nợ'  },
  { href: '/fund',   icon: '💰', label: 'Quỹ'      },
]

export function BottomNav() {
  const pathname = usePathname()
  if (pathname === '/login' || pathname.startsWith('/room/')) return null
  return (
    <nav className="fixed left-0 right-0 bottom-0 bg-amber-50 border-t-2 border-amber-200 grid grid-cols-4 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)', bottom: 0 }}>
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
