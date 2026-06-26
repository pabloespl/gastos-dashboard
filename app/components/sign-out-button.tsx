'use client'

import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border border-border-strong bg-bg-card px-3 py-1.5 text-sm text-text-secondary transition hover:bg-bg-secondary hover:text-text-primary active:scale-95"
    >
      Cerrar sesión
    </button>
  )
}
