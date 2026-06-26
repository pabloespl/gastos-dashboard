'use client'

import { Badge } from '@/app/components/atoms/Badge'
import { CategorySelect } from '@/app/components/molecules/CategorySelect'
import { formatCLP, formatChileDate } from '@/app/lib/utils'
import type { TransactionWithCategory } from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

interface TransactionCardProps {
  transaction: TransactionWithCategory
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (merchant: string, count: number, categoryId: number, categoryName: string) => void
}

export function TransactionCard({
  transaction: t,
  categories,
  onCategoryChange,
  onBulkPrompt,
}: TransactionCardProps) {
  return (
    <div className="flex items-start justify-between px-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-text-primary">{t.merchant ?? '—'}</p>
        <div className="mt-1 flex items-center gap-2">
          <CategorySelect
            messageId={t.message_id}
            merchant={t.merchant ?? ''}
            categoryId={t.category_id}
            categoryName={t.categories?.name ?? null}
            categories={categories}
            onCategoryChange={onCategoryChange}
            onBulkPrompt={onBulkPrompt}
          />
          <span className="text-xs text-text-muted">
            {t.datetime ? formatChileDate(t.datetime) : '—'}
          </span>
        </div>
      </div>
      <div className="ml-4 shrink-0 text-right">
        <p className="font-semibold text-text-primary whitespace-nowrap">
          {t.amount != null
            ? t.currency === 'CLP'
              ? formatCLP(t.amount)
              : `USD ${t.amount.toFixed(2)}`
            : '—'}
        </p>
        <Badge label={t.currency ?? '—'} variant={t.currency === 'CLP' ? 'indigo' : 'default'} />
      </div>
    </div>
  )
}
