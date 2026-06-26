'use client'

import { TransactionCard } from '@/app/components/molecules/TransactionCard'
import type { TransactionWithCategory } from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

interface TransactionListProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (merchant: string, count: number, categoryId: number, categoryName: string) => void
  onSuccess?: () => void
}

export function TransactionList({
  transactions,
  categories,
  onCategoryChange,
  onBulkPrompt,
  onSuccess,
}: TransactionListProps) {
  if (transactions.length === 0) {
    return (
      <p className="sm:hidden px-4 py-12 text-center text-sm text-text-muted">
        No hay transacciones registradas aún.
      </p>
    )
  }

  return (
    <div className="sm:hidden divide-y divide-border">
      {transactions.map((t) => (
        <TransactionCard
          key={t.message_id}
          transaction={t}
          categories={categories}
          onCategoryChange={onCategoryChange}
          onBulkPrompt={onBulkPrompt}
          onSuccess={onSuccess}
        />
      ))}
    </div>
  )
}
