'use client'

import { CategorySelect } from '@/app/components/molecules/CategorySelect'
import { formatCLP, formatChileDateShort } from '@/app/lib/utils'
import { useAmountsVisible } from '@/app/context/AmountsVisibilityContext'
import type { TransferWithCategory } from '@/src/types/transfer'
import type { Category } from '@/src/types/category'

interface TransferCardProps {
  transfer: TransferWithCategory
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onSuccess?: () => void
}

export function TransferCard({
  transfer: t,
  categories,
  onCategoryChange,
  onSuccess,
}: TransferCardProps) {
  const { isVisible } = useAmountsVisible()
  return (
    <div className="space-y-1.5 px-4 py-3">
      {/* Fila 1: destinatario + monto */}
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-semibold text-text-primary">{t.recipient_name ?? '—'}</p>
        <p className="shrink-0 whitespace-nowrap font-semibold text-text-primary">
          {t.amount == null ? '—' : !isVisible ? '•••••' : formatCLP(t.amount)}
        </p>
      </div>
      {/* Fila 2: categoría + fecha */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <CategorySelect
          variant="badge"
          messageId={t.message_id}
          merchant=""
          categoryId={t.category_id}
          categoryName={t.categories?.name ?? null}
          categories={categories}
          onCategoryChange={onCategoryChange}
          onBulkPrompt={() => {}}
          onSuccess={onSuccess}
          endpoint="/api/transfers"
        />
        <span className="text-xs text-text-muted">
          {t.datetime ? formatChileDateShort(t.datetime) : '—'}
        </span>
      </div>
    </div>
  )
}
