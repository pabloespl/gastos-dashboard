'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { Category } from '@/src/types/category'
import type { PatchTransactionResponse } from '@/src/types/transaction'

type DropdownPos =
  | { dir: 'down'; top: number; left: number }
  | { dir: 'up'; bottom: number; left: number }

// Estimated max height of the dropdown (8 categories × ~28px + padding)
const DROPDOWN_HEIGHT = 260

interface UseCategoryDropdownProps {
  categoryId: number | null
  categoryName: string | null
  messageId: string
  merchant: string
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (messageId: string, merchant: string, uncategorizedCount: number, categorizedCount: number, categoryId: number, categoryName: string) => void
  onSuccess?: () => void
}

export interface UseCategoryDropdownReturn {
  current: number | null
  currentName: string | null
  open: boolean
  dropdownPos: DropdownPos
  mounted: boolean
  pending: boolean
  buttonRef: RefObject<HTMLButtonElement>
  dropdownRef: RefObject<HTMLDivElement>
  handleOpen: () => void
  handleSelect: (cat: Category) => void
}

export function useCategoryDropdown({
  categoryId,
  categoryName,
  messageId,
  merchant,
  onCategoryChange,
  onBulkPrompt,
  onSuccess,
}: UseCategoryDropdownProps): UseCategoryDropdownReturn {
  const [current, setCurrent]         = useState<number | null>(categoryId)
  const [currentName, setCurrentName] = useState<string | null>(categoryName)
  const [open, setOpen]               = useState(false)
  const [dropdownPos, setDropdownPos] = useState<DropdownPos>({ dir: 'down', top: 0, left: 0 })
  const [mounted, setMounted]         = useState(false)
  const [pending, startTransition]    = useTransition()
  const buttonRef   = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    setCurrent(categoryId)
    setCurrentName(categoryName)
  }, [categoryId, categoryName])

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (
        buttonRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
    }
    // Close on scroll so the fixed dropdown doesn't drift from its anchor
    function onScroll() { setOpen(false) }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  function handleOpen() {
    if (pending) return
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      if (rect.bottom + DROPDOWN_HEIGHT > window.innerHeight) {
        setDropdownPos({ dir: 'up', bottom: window.innerHeight - rect.top + 4, left: rect.left })
      } else {
        setDropdownPos({ dir: 'down', top: rect.bottom + 4, left: rect.left })
      }
    }
    setOpen(o => !o)
  }

  function handleSelect(cat: Category) {
    setCurrentName(cat.name)
    setCurrent(cat.id)
    setOpen(false)

    startTransition(async () => {
      const res = await fetch(`/api/transactions/${messageId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ category_id: cat.id }),
      })
      if (!res.ok) return
      const json = (await res.json()) as PatchTransactionResponse
      onCategoryChange(messageId, cat.id, cat.name)
      onBulkPrompt(messageId, merchant, json.uncategorizedSiblings, json.categorizedSiblings, cat.id, cat.name)
      onSuccess?.()
    })
  }

  return { current, currentName, open, dropdownPos, mounted, pending, buttonRef, dropdownRef, handleOpen, handleSelect }
}
