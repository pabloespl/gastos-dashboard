import type { ReactNode } from 'react'

interface SummaryCardProps {
  label: string
  value: string
  sub: string
  icon?: ReactNode
}

export function SummaryCard({ label, value, sub, icon }: SummaryCardProps) {
  return (
    <div className="relative rounded-2xl border border-border bg-bg-card p-4 shadow-sm sm:p-5">
      {icon && (
        <div className="absolute right-4 top-4 text-text-muted opacity-40">
          {icon}
        </div>
      )}
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-2 text-lg font-bold text-text-primary sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-text-muted">{sub}</p>
    </div>
  )
}
