'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowLeftRight, Menu, X } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transferencias', label: 'Transferencias', icon: ArrowLeftRight },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 px-3 py-2">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-primary-light text-primary'
                : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function NavToggle() {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        aria-label="Abrir menú de navegación"
        className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition hover:bg-bg-hover hover:text-text-primary active:scale-95"
      >
        <Menu size={20} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-64 flex-col bg-bg-card shadow-lg">
            <div className="flex h-14 items-center justify-between gap-2 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-base">
                  💸
                </div>
                <span className="text-sm font-semibold text-text-primary">Gastos Dashboard</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú de navegación"
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-secondary transition hover:bg-bg-hover hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
