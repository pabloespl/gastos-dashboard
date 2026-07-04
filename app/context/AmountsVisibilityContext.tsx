'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'amountsVisible'

interface AmountsVisibilityContextValue {
  isVisible: boolean
  toggle: () => void
}

const AmountsVisibilityContext = createContext<AmountsVisibilityContextValue | null>(null)

export function AmountsVisibilityProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setIsVisible(stored === 'true')
  }, [])

  function toggle() {
    setIsVisible((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <AmountsVisibilityContext.Provider value={{ isVisible, toggle }}>
      {children}
    </AmountsVisibilityContext.Provider>
  )
}

export function useAmountsVisible(): AmountsVisibilityContextValue {
  const ctx = useContext(AmountsVisibilityContext)
  if (!ctx) throw new Error('useAmountsVisible must be used within an AmountsVisibilityProvider')
  return ctx
}
