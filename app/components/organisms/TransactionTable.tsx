'use client'

import { Trash2, RotateCcw } from 'lucide-react'
import { CategorySelect } from '@/app/components/molecules/CategorySelect'
import { formatCLP, formatChileDate } from '@/app/lib/utils'
import { useAmountsVisible } from '@/app/context/AmountsVisibilityContext'
import type { TransactionWithCategory } from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

const TABLE_COLUMNS = ['Fecha', 'Comercio', 'Monto', 'Categoría', 'Tarjeta', '']

interface TransactionTableProps {
  transactions: TransactionWithCategory[]
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (messageId: string, merchant: string, uncategorizedCount: number, categorizedCount: number, categoryId: number, categoryName: string) => void
  onSuccess?: () => void
  onExclude: (messageId: string) => void
  onRestore: (messageId: string) => void
  mode: 'active' | 'excluded'
}

export function TransactionTable({
  transactions,
  categories,
  onCategoryChange,
  onBulkPrompt,
  onSuccess,
  onExclude,
  onRestore,
  mode,
}: TransactionTableProps) {
  const { isVisible } = useAmountsVisible()
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
                {mode === 'excluded' ? 'No hay transacciones excluidas.' : 'No hay transacciones registradas aún.'}
              </td>
            </tr>
          ) : (
            transactions.map((t) => (
              <tr key={t.message_id} className="hover:bg-bg-secondary transition-colors">
                <td className="px-6 py-3 text-text-secondary whitespace-nowrap" suppressHydrationWarning>
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
                  {t.amount == null
                    ? '—'
                    : !isVisible
                      ? '•••••'
                      : t.currency === 'CLP'
                        ? formatCLP(t.amount)
                        : `${t.currency} ${t.amount.toFixed(2)}`}
                </td>
                <td className="px-6 py-3">
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
                </td>
                <td className="px-6 py-3 text-text-secondary font-mono text-xs">
                  {t.card_last4 ? `···· ${t.card_last4}` : '—'}
                </td>
                <td className="px-6 py-3">
                  {mode === 'excluded' ? (
                    <button
                      type="button"
                      aria-label="Restaurar transacción"
                      title="Restaurar transacción"
                      onClick={() => {
                        if (window.confirm('¿Restaurar esta transacción al dashboard?')) {
                          onRestore(t.message_id)
                        }
                      }}
                      className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-green-500/10 hover:text-green-600"
                    >
                      <RotateCcw size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      aria-label="Excluir transacción"
                      title="Excluir transacción"
                      onClick={() => {
                        if (window.confirm('¿Excluir esta transacción del dashboard?')) {
                          onExclude(t.message_id)
                        }
                      }}
                      className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
