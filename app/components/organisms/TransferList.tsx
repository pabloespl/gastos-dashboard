'use client'

import { TransferCard } from '@/app/components/molecules/TransferCard'
import type { TransferWithCategory } from '@/src/types/transfer'
import type { Category } from '@/src/types/category'

interface TransferListProps {
  transfers: TransferWithCategory[]
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onSuccess?: () => void
}

export function TransferList({
  transfers,
  categories,
  onCategoryChange,
  onSuccess,
}: TransferListProps) {
  if (transfers.length === 0) {
    return (
      <p className="sm:hidden px-4 py-12 text-center text-sm text-text-muted">
        No hay transferencias registradas aún.
      </p>
    )
  }

  return (
    <div className="sm:hidden divide-y divide-border">
      {transfers.map((t) => (
        <TransferCard
          key={t.message_id}
          transfer={t}
          categories={categories}
          onCategoryChange={onCategoryChange}
          onSuccess={onSuccess}
        />
      ))}
    </div>
  )
}
