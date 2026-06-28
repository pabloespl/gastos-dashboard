'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CategoryBadge } from '@/app/components/atoms/CategoryBadge'
import type { Category } from '@/src/types/category'
import type { PatchTransactionResponse } from '@/src/types/transaction'

interface CategoryBadgeSelectProps {
  messageId: string
  merchant: string
  categoryId: number | null
  categoryName: string | null
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (merchant: string, uncategorizedCount: number, categorizedCount: number, categoryId: number, categoryName: string) => void
  onSuccess?: () => void
}

export function CategoryBadgeSelect({
  messageId,
  merchant,
  categoryId,
  categoryName,
  categories,
  onCategoryChange,
  onBulkPrompt,
  onSuccess,
}: CategoryBadgeSelectProps) {
  const [current, setCurrent]         = useState<number | null>(categoryId)
  const [currentName, setCurrentName] = useState<string | null>(categoryName)
  const [open, setOpen]               = useState(false)
  const [dropdownPos, setDropdownPos] = useState<
    { dir: 'down'; top: number; left: number } | { dir: 'up'; bottom: number; left: number }
  >({ dir: 'down', top: 0, left: 0 })
  const [mounted, setMounted]         = useState(false)
  const [pending, startTransition]    = useTransition()
  const buttonRef  = useRef<HTMLButtonElement>(null)
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

  // Estimated max height of the dropdown (8 categories × ~28px + padding)
  const DROPDOWN_HEIGHT = 260

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
    setOpen((o) => !o)
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
      if (json.uncategorizedSiblings > 0 || json.categorizedSiblings > 0) {
        onBulkPrompt(merchant, json.uncategorizedSiblings, json.categorizedSiblings, cat.id, cat.name)
      }
      onSuccess?.()
    })
  }

  const dropdown = open && categories.length > 0 && (
    <div
      ref={dropdownRef}
      role="listbox"
      style={
        dropdownPos.dir === 'down'
          ? { top: dropdownPos.top, left: dropdownPos.left }
          : { bottom: dropdownPos.bottom, left: dropdownPos.left }
      }
      className="fixed z-50 w-48 rounded-xl border border-border bg-bg-card py-1.5 shadow-lg"
    >
      {categories.map((cat) => (
        <button
          key={cat.id}
          role="option"
          aria-selected={cat.id === current}
          onClick={() => handleSelect(cat)}
          className="flex w-full items-center px-3 py-1.5 hover:bg-bg-secondary"
        >
          <CategoryBadge name={cat.name} />
        </button>
      ))}
    </div>
  )

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        disabled={pending}
        className="cursor-pointer disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <CategoryBadge name={currentName} />
      </button>
      {mounted && createPortal(dropdown, document.body)}
    </div>
  )
}
