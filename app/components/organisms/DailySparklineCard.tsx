'use client'

import { useState, useEffect, useRef } from 'react'
import { formatCLP } from '@/app/lib/utils'
import type { TransactionSummary } from '@/src/types/transaction'

interface Props {
  summary: TransactionSummary
}

export function DailySparklineCard({ summary }: Props) {
  const { dailyTotals, clpTotal, daysElapsed, daysInMonth } = summary

  const today = new Intl.DateTimeFormat('sv', { timeZone: 'America/Santiago' }).format(new Date())
  const [yearStr, monthStr] = today.split('-')

  const totalsMap = new Map(dailyTotals.map((d) => [d.date, d.total]))
  const fullMonth = Array.from({ length: daysInMonth }, (_, i) => {
    const day  = String(i + 1).padStart(2, '0')
    const date = `${yearStr}-${monthStr}-${day}`
    return { date, total: totalsMap.get(date) ?? 0 }
  })

  const last25   = fullMonth.filter((d) => d.date <= today).slice(-25)
  const maxTotal = last25.reduce((m, d) => (d.total > m ? d.total : m), 0)

  const highDay = dailyTotals.reduce<{ date: string; total: number } | null>(
    (best, d) => (!best || d.total > best.total ? d : best),
    null,
  )

  const projection = daysElapsed > 0 ? (clpTotal / daysElapsed) * daysInMonth : 0

  // Track the sparkline container's real height so bars scale with it
  const chartRef = useRef<HTMLDivElement>(null)
  const [chartH, setChartH] = useState(64)

  useEffect(() => {
    const el = chartRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => {
      setChartH(entry.contentRect.height)
    })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    // flex flex-col so flex-1 on the inner wrapper fills remaining card height
    <div className="flex flex-col rounded-2xl border border-border bg-bg-card p-5 shadow-sm">
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-text-muted">Gasto diario</p>

      {dailyTotals.length === 0 ? (
        <p className="text-xs text-text-muted">Sin datos aún.</p>
      ) : (
        // flex-1 (not h-full) so this wrapper only takes what the card leaves
        // after the title, rather than trying to be 100% of the full card height
        <div className="flex flex-1 flex-col">
          <div ref={chartRef} className="flex min-h-16 flex-1 w-full gap-0.5">
            {last25.map(({ date, total }) => {
              const heightPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0
              // 0.85 cap so the tallest bar has breathing room at the top
              const barPx     = total > 0 ? Math.max(Math.round((heightPct / 100) * chartH * 0.85), 2) : 0
              const isToday   = date === today
              return (
                <div
                  key={date}
                  className="group relative h-full flex-1"
                  title={`${date.slice(8)}/${date.slice(5, 7)}: ${formatCLP(total)}`}
                >
                  <div
                    className={`absolute w-full rounded-sm ${isToday ? 'bg-primary-bar' : 'bg-border group-hover:bg-border-strong'}`}
                    style={{ height: barPx, bottom: 0 }}
                  />
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex justify-between">
            <div>
              <p className="text-sm text-text-muted">Día más alto</p>
              {highDay ? (
                <p className="text-base font-medium text-text-primary">
                  {formatCLP(highDay.total)}{' '}
                  <span className="text-sm font-normal text-text-muted">· {highDay.date.slice(8)}</span>
                </p>
              ) : (
                <p className="text-sm text-text-muted">—</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">Proyección del mes</p>
              <p className="text-base font-medium text-text-primary tabular-nums">{formatCLP(projection)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
