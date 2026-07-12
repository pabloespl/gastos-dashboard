'use client'

import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { CategoryBadge } from '@/app/components/atoms/CategoryBadge'
import { useCategoryDropdown } from '@/app/hooks/useCategoryDropdown'
import type { Category } from '@/src/types/category'
import { sortCategoriesWithOtrosLast } from '@/app/lib/utils'

interface CategorySelectProps {
  messageId: string
  merchant: string
  categoryId: number | null
  categoryName: string | null
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (messageId: string, merchant: string, uncategorizedCount: number, categorizedCount: number, categoryId: number, categoryName: string) => void
  onSuccess?: () => void
  variant?: 'badge' | 'control'
  endpoint?: string
}

export function CategorySelect({
  messageId,
  merchant,
  categoryId,
  categoryName,
  categories,
  onCategoryChange,
  onBulkPrompt,
  onSuccess,
  variant = 'control',
  endpoint,
}: CategorySelectProps) {
  const {
    current,
    currentName,
    open,
    dropdownPos,
    mounted,
    pending,
    buttonRef,
    dropdownRef,
    handleOpen,
    handleSelect,
  } = useCategoryDropdown({ categoryId, categoryName, messageId, merchant, onCategoryChange, onBulkPrompt, onSuccess, endpoint })

  const sortedCategories = sortCategoriesWithOtrosLast(categories)

  const dropdown = open && categories.length > 0 && (
    <div
      ref={dropdownRef}
      role="listbox"
      style={
        dropdownPos.dir === 'down'
          ? { top: dropdownPos.top, left: dropdownPos.left }
          : { bottom: dropdownPos.bottom, left: dropdownPos.left }
      }
      className="fixed z-50 w-48 rounded-xl border border-border bg-bg-card p-1 shadow-lg"
    >
      {sortedCategories.map((cat) => (
        <button
          key={cat.id}
          role="option"
          aria-selected={cat.id === current}
          onClick={() => handleSelect(cat)}
          className={`flex w-full items-center rounded-lg px-3 py-1.5 transition-colors hover:bg-bg-hover active:bg-bg-hover-strong ${
            cat.id === current ? 'font-medium' : ''
          }`}
        >
          <CategoryBadge name={cat.name} />
        </button>
      ))}
    </div>
  )

  return (
    <div className="relative">
      {variant === 'badge' ? (
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
      ) : (
        <button
          ref={buttonRef}
          onClick={handleOpen}
          disabled={pending}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={`inline-flex items-center gap-2 rounded-md border bg-bg-secondary px-3 py-1.5 text-sm transition-colors hover:border-border-strong disabled:opacity-50 ${
            open ? 'border-primary' : 'border-border'
          }`}
        >
          {currentName
            ? <CategoryBadge name={currentName} />
            : <span className="text-text-muted">Sin categoría</span>
          }
          <ChevronDown
            size={14}
            className={`shrink-0 text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      )}
      {mounted && createPortal(dropdown, document.body)}
    </div>
  )
}
