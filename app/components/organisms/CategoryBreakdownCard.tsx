import { formatCLP } from '@/app/lib/utils'
import { CATEGORY_BAR_CLASSES } from '@/app/components/atoms/CategoryBadge'
import type { TransactionSummary } from '@/src/types/transaction'

interface Props {
  summary: TransactionSummary
}

export function CategoryBreakdownCard({ summary }: Props) {
  const { categoryBreakdown } = summary
  const max = categoryBreakdown[0]?.total ?? 1

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-5 shadow-sm">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-text-muted">Por categoría</p>

      {categoryBreakdown.length === 0 ? (
        <p className="text-xs text-text-muted">Sin datos de categorías aún.</p>
      ) : (
        <div className="space-y-3">
          {categoryBreakdown.map(({ name, total }) => {
            const pct = (total / max) * 100
            const barClass = CATEGORY_BAR_CLASSES[name.toLowerCase()] ?? 'bg-cat-otros-bar'
            return (
              <div key={name}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-text-primary">{name}</span>
                  <span className="tabular-nums text-xs text-text-secondary">{formatCLP(total)}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-bg-secondary">
                  <div
                    className={`h-1.5 rounded-full transition-all ${barClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
