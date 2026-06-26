'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
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
  onBulkPrompt: (merchant: string, count: number, categoryId: number, categoryName: string) => void
}

export function CategoryBadgeSelect({
  messageId,
  merchant,
  categoryId,
  categoryName,
  categories,
  onCategoryChange,
  onBulkPrompt,
}: CategoryBadgeSelectProps) {
  const [current, setCurrent]       = useState<number | null>(categoryId)
  const [currentName, setCurrentName] = useState<string | null>(categoryName)
  const [open, setOpen]             = useState(false)
  const [pending, startTransition]  = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrent(categoryId)
    setCurrentName(categoryName)
  }, [categoryId, categoryName])

  useEffect(() => {
    if (!open) return
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [open])

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
      if (json.uncategorizedSiblings > 0) {
        onBulkPrompt(merchant, json.uncategorizedSiblings, cat.id, cat.name)
      }
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { if (!pending) setOpen((o) => !o) }}
        disabled={pending}
        className="cursor-pointer disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <CategoryBadge name={currentName} />
      </button>

      {open && categories.length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 w-48 rounded-xl border border-border bg-bg-card py-1.5 shadow-lg"
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
      )}
    </div>
  )
}
