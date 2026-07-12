'use client'

import { CreditCard, Trash2 } from 'lucide-react'
import { CategorySelect } from '@/app/components/molecules/CategorySelect'
import { formatCLP, formatChileDateShort } from '@/app/lib/utils'
import { useAmountsVisible } from '@/app/context/AmountsVisibilityContext'
import type { TransactionWithCategory } from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

interface TransactionCardProps {
  transaction: TransactionWithCategory
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (messageId: string, merchant: string, uncategorizedCount: number, categorizedCount: number, categoryId: number, categoryName: string) => void
  onSuccess?: () => void
  onExclude: (messageId: string) => void
}

export function TransactionCard({
  transaction: t,
  categories,
  onCategoryChange,
  onBulkPrompt,
  onSuccess,
  onExclude,
}: TransactionCardProps) {
  const { isVisible } = useAmountsVisible()
  return (
    <div className="space-y-1.5 px-4 py-3">
      {/* Fila 1: comercio + monto */}
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-semibold text-text-primary">{t.merchant ?? '—'}</p>
        <p className="shrink-0 whitespace-nowrap font-semibold text-text-primary">
          {t.amount == null
            ? '—'
            : !isVisible
              ? '•••••'
              : t.currency === 'CLP'
                ? formatCLP(t.amount)
                : `USD ${t.amount.toFixed(2)}`}
        </p>
      </div>
      {/* Fila 2: categoría + metadato (fecha · tarjeta) + excluir */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <CategorySelect
          variant="badge"
          messageId={t.message_id}
          merchant={t.merchant ?? ''}
          categoryId={t.category_id}
          categoryName={t.categories?.name ?? null}
          categories={categories}
          onCategoryChange={onCategoryChange}
          onBulkPrompt={onBulkPrompt}
          onSuccess={onSuccess}
        />
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <span>{t.datetime ? formatChileDateShort(t.datetime) : '—'}</span>
            {t.card_last4 && (
              <>
                <span>·</span>
                <CreditCard size={12} className="shrink-0" />
                <span className="font-mono">{t.card_last4}</span>
              </>
            )}
          </span>
          <button
            type="button"
            aria-label="Excluir transacción"
            title="Excluir transacción"
            onClick={() => {
              if (window.confirm('¿Excluir esta transacción del dashboard?')) {
                onExclude(t.message_id)
              }
            }}
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
