'use client'

import { createPortal } from 'react-dom'
import { CategoryBadge } from '@/app/components/atoms/CategoryBadge'
import { useCategoryDropdown } from '@/app/hooks/useCategoryDropdown'
import type { Category } from '@/src/types/category'

interface CategoryBadgeSelectProps {
  messageId: string
  merchant: string
  categoryId: number | null
  categoryName: string | null
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (messageId: string, merchant: string, uncategorizedCount: number, categorizedCount: number, categoryId: number, categoryName: string) => void
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
  } = useCategoryDropdown({ categoryId, categoryName, messageId, merchant, onCategoryChange, onBulkPrompt, onSuccess })

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
      {categories.map((cat) => (
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
