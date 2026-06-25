'use client'

import { Badge } from '@/app/components/atoms/Badge'
import { CategorySelect } from '@/app/components/molecules/CategorySelect'
import { formatCLP, formatChileDate } from '@/app/lib/utils'
import type { TransactionWithCategory } from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

const TABLE_COLUMNS = ['Fecha', 'Comercio', 'Monto', 'Moneda', 'Categoría', 'Tarjeta']

interface TransactionTableProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (merchant: string, count: number, categoryId: number, categoryName: string) => void
}

export function TransactionTable({
  transactions,
  categories,
  onCategoryChange,
  onBulkPrompt,
}: TransactionTableProps) {
  return (
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {TABLE_COLUMNS.map((col) => (
              <th
                key={col}
                className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {transactions.length === 0 ? (
            <tr>
              <td colSpan={TABLE_COLUMNS.length} className="px-6 py-12 text-center text-sm text-gray-400">
                No hay transacciones registradas aún.
              </td>
            </tr>
          ) : (
            transactions.map((t) => (
              <tr key={t.message_id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                  {t.datetime ? formatChileDate(t.datetime) : '—'}
                </td>
                <td className="px-6 py-3 text-gray-900 font-medium">{t.merchant ?? '—'}</td>
                <td className="px-6 py-3 text-gray-900 whitespace-nowrap">
                  {t.amount != null
                    ? t.currency === 'CLP'
                      ? formatCLP(t.amount)
                      : `${t.currency} ${t.amount.toFixed(2)}`
                    : '—'}
                </td>
                <td className="px-6 py-3">
                  <Badge label={t.currency ?? '—'} />
                </td>
                <td className="px-6 py-3">
                  <CategorySelect
                    messageId={t.message_id}
                    merchant={t.merchant ?? ''}
                    categoryId={t.category_id}
                    categoryName={t.categories?.name ?? null}
                    categories={categories}
                    onCategoryChange={onCategoryChange}
                    onBulkPrompt={onBulkPrompt}
                  />
                </td>
                <td className="px-6 py-3 text-gray-500 font-mono text-xs">
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
