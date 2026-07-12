'use client'

import { CategorySelect } from '@/app/components/molecules/CategorySelect'
import { formatCLP, formatChileDate } from '@/app/lib/utils'
import { useAmountsVisible } from '@/app/context/AmountsVisibilityContext'
import type { TransferWithCategory } from '@/src/types/transfer'
import type { Category } from '@/src/types/category'

const TABLE_COLUMNS = ['Fecha', 'Destinatario', 'Banco', 'Monto', 'Categoría']

interface TransferTableProps {
  transfers: TransferWithCategory[]
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onSuccess?: () => void
}

export function TransferTable({
  transfers,
  categories,
  onCategoryChange,
  onSuccess,
}: TransferTableProps) {
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
          {transfers.length === 0 ? (
            <tr>
              <td colSpan={TABLE_COLUMNS.length} className="px-6 py-12 text-center text-sm text-text-muted">
                No hay transferencias registradas aún.
              </td>
            </tr>
          ) : (
            transfers.map((t) => (
              <tr key={t.message_id} className="hover:bg-bg-secondary transition-colors">
                <td className="px-6 py-3 text-text-secondary whitespace-nowrap" suppressHydrationWarning>
                  {t.datetime ? formatChileDate(t.datetime) : '—'}
                </td>
                <td className="px-6 py-3">
                  <span
                    className="block max-w-[200px] truncate font-medium text-text-primary"
                    title={t.recipient_name ?? ''}
                  >
                    {t.recipient_name ?? '—'}
                  </span>
                </td>
                <td className="px-6 py-3 text-text-secondary whitespace-nowrap">
                  {t.recipient_bank ?? '—'}
                </td>
                <td className="px-6 py-3 text-right tabular-nums text-text-primary whitespace-nowrap">
                  {t.amount == null ? '—' : !isVisible ? '•••••' : formatCLP(t.amount)}
                </td>
                <td className="px-6 py-3">
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
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
