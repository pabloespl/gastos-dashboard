interface SummaryCardProps {
  label: string
  value: string
  sub: string
}

export function SummaryCard({ label, value, sub }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-gray-900 sm:text-2xl">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  )
}
