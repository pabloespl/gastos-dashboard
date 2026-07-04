'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useAmountsVisible } from '@/app/context/AmountsVisibilityContext'

export function ToggleAmountsButton() {
  const { isVisible, toggle } = useAmountsVisible()

  return (
    <button
      onClick={toggle}
      title={isVisible ? 'Ocultar montos' : 'Mostrar montos'}
      aria-label={isVisible ? 'Ocultar montos' : 'Mostrar montos'}
      className="flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition hover:bg-bg-hover hover:text-text-primary active:scale-95"
    >
      {isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
    </button>
  )
}
