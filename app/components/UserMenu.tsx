'use client'

import { useEffect, useRef, useState } from 'react'
import { HelpCircle, LogOut, Moon, Monitor, Settings, Sun } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/app/hooks/useTheme'

interface UserMenuProps {
  email: string
  fullName: string | null
}

function getInitials(fullName: string | null, email: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  const prefix = email.split('@')[0]
  return prefix.slice(0, 2).toUpperCase()
}

function getAvatarColor(email: string): string {
  const colors = [
    'bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-emerald-500',
    'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500',
  ]
  let hash = 0
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function UserMenu({ email, fullName }: UserMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const initials = getInitials(fullName, email)
  const avatarColor = getAvatarColor(email)
  const displayName = fullName ?? email.split('@')[0]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menú de usuario"
        className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-95 ${avatarColor}`}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 min-w-[220px] rounded-lg border border-border bg-bg-card p-2 shadow-lg z-50">

          {/* Sección 1 — identidad */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor}`}>
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-primary leading-tight">{displayName}</p>
              <p className="truncate max-w-[150px] text-xs text-text-secondary leading-tight mt-0.5">{email}</p>
            </div>
          </div>

          <hr className="border-border my-1.5" />

          {/* Sección 2 — tema */}
          <div className="flex items-center justify-between px-2 py-0.5">
            <span className="text-sm text-text-secondary">Theme</span>
            <div className="flex items-center w-fit bg-bg-secondary rounded-full p-0 border border-border">
              <button
                onClick={() => setTheme('system')}
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer ${theme === 'system' ? 'bg-bg-card text-text-primary shadow-sm ring-1 ring-border-strong' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer ${theme === 'light' ? 'bg-bg-card text-text-primary shadow-sm ring-1 ring-border-strong' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors cursor-pointer ${theme === 'dark' ? 'bg-bg-card text-text-primary shadow-sm ring-1 ring-border-strong' : 'text-text-secondary hover:text-text-primary'}`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <hr className="border-border my-1.5" />

          {/* Sección 3 — navegación */}
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover active:bg-bg-hover-strong transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover active:bg-bg-hover-strong transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Help &amp; support
          </button>

          <hr className="border-border my-1.5" />

          {/* Sección 4 — cerrar sesión */}
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm leading-tight text-red-500 transition-colors hover:bg-red-500/10 active:bg-red-500/15"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}
