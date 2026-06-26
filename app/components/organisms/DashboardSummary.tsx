import { Wallet, Receipt, Tag, TrendingUp } from 'lucide-react'
import { SummaryCard } from '@/app/components/molecules/SummaryCard'
import { formatCLP } from '@/app/lib/utils'
import type { TransactionSummary } from '@/src/types/transaction'

interface DashboardSummaryProps {
  summary: TransactionSummary
}

export function DashboardSummary({ summary }: DashboardSummaryProps) {
  const {
    clpTotal,
    usdTotal,
    txnCount,
    topCategory,
    topCategoryCount,
    avgPerDay,
    monthLabel,
    daysElapsed,
  } = summary

  const cards = [
    {
      label: 'Total del mes',
      value: txnCount === 0 ? '—' : formatCLP(clpTotal),
      sub:   usdTotal > 0 ? `+ USD ${usdTotal.toFixed(2)} por separado` : monthLabel,
      icon:  <Wallet size={20} />,
    },
    {
      label: 'Transacciones',
      value: txnCount === 0 ? '—' : String(txnCount),
      sub:   monthLabel,
      icon:  <Receipt size={20} />,
    },
    {
      label: 'Categoría top',
      value: topCategory ?? '—',
      sub:   topCategory ? `${topCategoryCount} transacciones` : 'Sin categorías aún',
      icon:  <Tag size={20} />,
    },
    {
      label: 'Promedio por día',
      value: txnCount === 0 ? '—' : formatCLP(avgPerDay),
      sub:   `${daysElapsed} días transcurridos`,
      icon:  <TrendingUp size={20} />,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  )
}
