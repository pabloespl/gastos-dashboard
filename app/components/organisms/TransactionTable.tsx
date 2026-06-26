'use client'

import { CategoryBadgeSelect } from '@/app/components/molecules/CategoryBadgeSelect'
import { formatCLP, formatChileDate } from '@/app/lib/utils'
import type { TransactionWithCategory } from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

const TABLE_COLUMNS = ['Fecha', 'Comercio', 'Monto', 'Categoría', 'Tarjeta']

interface TransactionTableProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (merchant: string, count: number, categoryId: number, categoryName: string) => void
  onSuccess?: () => void
}

export function TransactionTable({
  transactions,
  categories,
  onCategoryChange,
  onBulkPrompt,
  onSuccess,
}: TransactionTableProps) {
  return (
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-bg-secondary">
            {TABLE_COLUMNS.map((col) => (
              <th
                key={col}
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-text-muted"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={TABLE_COLUMNS.length} className="px-6 py-12 text-center text-sm text-text-muted">
                No hay transacciones registradas aún.
              </td>
            </tr>
          ) : (
            transactions.map((t) => (
              <tr key={t.message_id} className="hover:bg-bg-secondary transition-colors">
                <td className="px-6 py-3 text-text-secondary whitespace-nowrap">
                  {t.datetime ? formatChileDate(t.datetime) : '—'}
                </td>
                <td className="px-6 py-3">
                  <span
                    className="block max-w-[200px] truncate font-medium text-text-primary"
                    title={t.merchant ?? ''}
                  >
                    {t.merchant ?? '—'}
                  </span>
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-text-primary whitespace-nowrap">
                  {t.amount != null
                    ? t.currency === 'CLP'
                      ? formatCLP(t.amount)
                      : `${t.currency} ${t.amount.toFixed(2)}`
                    : '—'}
                </td>
                <td className="px-6 py-3">
                  <CategoryBadgeSelect
                    messageId={t.message_id}
                    merchant={t.merchant ?? ''}
                    categoryId={t.category_id}
                    categoryName={t.categories?.name ?? null}
                    categories={categories}
                    onCategoryChange={onCategoryChange}
                    onBulkPrompt={onBulkPrompt}
                    onSuccess={onSuccess}
                  />
                </td>
                <td className="px-6 py-3 text-text-secondary font-mono text-xs">
                  {t.card_last4 ? `···· ${t.card_last4}` : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
