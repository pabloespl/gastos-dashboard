'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { DropdownSelect } from '@/app/components/atoms/DropdownSelect'
import type { DropdownOption } from '@/app/components/atoms/DropdownSelect'
import { CategoryBadge } from '@/app/components/atoms/CategoryBadge'
import type { Category } from '@/src/types/category'
import type { TransactionFilters } from '@/app/hooks/useTransactionFilters'
import { sortCategoriesWithOtrosLast } from '@/app/lib/utils'

const TZ = 'America/Santiago'

function getCurrentYearMonth(): string {
  return new Intl.DateTimeFormat('sv', { timeZone: TZ }).format(new Date()).substring(0, 7)
}

const CURRENCY_OPTIONS: DropdownOption[] = [
  { value: '', label: 'Todas' },
  { value: 'CLP', label: 'CLP' },
  { value: 'USD', label: 'USD' },
]

function renderCategoryOption(option: DropdownOption): ReactNode {
  if (option.value === '') {
    return <span className="inline-block rounded-full px-2 py-0.5 text-sm text-text-primary">{option.label}</span>
  }
  if (option.value === 'uncategorized') {
    return <CategoryBadge name={null} className="text-sm" />
  }
  return <CategoryBadge name={option.label} className="text-sm" />
}

function renderCategoryValue(option: DropdownOption): ReactNode {
  if (option.value === '') return <span className="text-sm text-text-primary">{option.label}</span>
  if (option.value === 'uncategorized') return <span className="text-sm text-text-muted">Sin categoría</span>
  return <CategoryBadge name={option.label} className="text-sm" />
}

interface FilterBarProps {
  categories: Category[]
  months: { value: string; label: string }[]
  filters: TransactionFilters
  onChange: (filters: TransactionFilters) => void
  hasActiveFilters: boolean
}

const inputCls = 'h-9 w-full rounded-md border border-border bg-bg-secondary px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary hover:border-border-strong'
const labelCls = 'mb-1 block text-xs text-text-muted'

export function FilterBar({ categories, months, filters, onChange, hasActiveFilters }: FilterBarProps) {
  const handleClear = () => {
    onChange({ category: '', merchant: '', month: getCurrentYearMonth(), currency: '' })
  }

  const monthOptions: DropdownOption[] =
    months.length === 0
      ? [{ value: filters.month, label: 'Cargando…' }]
      : months

  const categoryOptions: DropdownOption[] = [
    { value: '', label: 'Todas' },
    ...sortCategoriesWithOtrosLast(categories).map(c => ({ value: String(c.id), label: c.name })),
    { value: 'uncategorized', label: 'Sin categoría' },
  ]

  return (
    <div className="border-b border-border px-4 py-3 sm:px-6">
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end sm:gap-3">
        <div>
          <label className={labelCls}>Período</label>
          <DropdownSelect
            value={filters.month}
            onChange={month => onChange({ ...filters, month })}
            options={monthOptions}
            sizingBuffer="pr-[44px]"
            className="w-full sm:w-fit"
          />
        </div>

        <div>
          <label className={labelCls}>Categoría</label>
          <DropdownSelect
            value={filters.category}
            onChange={category => onChange({ ...filters, category })}
            options={categoryOptions}
            renderOption={renderCategoryOption}
            renderValue={renderCategoryValue}
            sizingBuffer="pr-[56px]"
            className="w-full sm:w-fit"
            listClassName="pr-1 overscroll-contain [scrollbar-width:thin] [scrollbar-color:var(--color-border-strong)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border-strong [&::-webkit-scrollbar-thumb:hover]:bg-text-muted"
          />
        </div>

        <div>
          <label className={labelCls}>Comercio</label>
          <input
            type="text"
            className={inputCls}
            placeholder="Buscar…"
            value={filters.merchant}
            onChange={e => onChange({ ...filters, merchant: e.target.value })}
          />
        </div>

        <div>
          <label className={labelCls}>Moneda</label>
          <DropdownSelect
            value={filters.currency}
            onChange={currency => onChange({ ...filters, currency })}
            options={CURRENCY_OPTIONS}
            sizingBuffer="pr-0"
            className="w-full sm:w-fit"
          />
        </div>

        {hasActiveFilters && (
          <div className="col-span-2 flex items-end">
            <button
              type="button"
              onClick={handleClear}
              className="flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-text-muted hover:bg-bg-secondary hover:text-text-primary"
            >
              <X size={12} />
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
