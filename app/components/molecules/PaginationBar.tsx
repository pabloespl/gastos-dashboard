'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DropdownSelect } from '@/app/components/atoms/DropdownSelect'

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

interface PaginationBarProps {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
  onPrev: () => void
  onNext: () => void
  onPageSizeChange: (n: number) => void
  pageSizeOptions?: number[]
}

export function PaginationBar({
  page,
  pageSize,
  totalPages,
  totalItems,
  onPrev,
  onNext,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: PaginationBarProps) {
  const from = Math.min((page - 1) * pageSize + 1, totalItems)
  const to   = Math.min(page * pageSize, totalItems)

  const sizeOptions = pageSizeOptions.map(n => ({ value: String(n), label: String(n) }))

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
      <p className="text-sm text-text-muted">
        Mostrando {from}–{to} de {totalItems}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={page === 1}
          aria-label="Página anterior"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="min-w-[3.5rem] text-center text-xs tabular-nums text-text-secondary">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={page === totalPages}
          aria-label="Página siguiente"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-text-muted">Por página:</span>
        <DropdownSelect
          value={String(pageSize)}
          onChange={val => onPageSizeChange(Number(val))}
          options={sizeOptions}
          className="w-20"
        />
      </div>
    </div>
  )
}
