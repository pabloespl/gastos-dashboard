const TZ = 'America/Santiago'

export function formatCLP(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatChileDate(iso: string): string {
  return new Date(iso).toLocaleString('es-CL', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export interface MonthBounds {
  start: string
  end: string
  daysElapsed: number
  daysInMonth: number
  monthLabel: string
}

export function getMonthBounds(): MonthBounds {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const year  = parseInt(parts.find(p => p.type === 'year')!.value)
  const month = parseInt(parts.find(p => p.type === 'month')!.value)
  const day   = parseInt(parts.find(p => p.type === 'day')!.value)

  const startTs    = new Date(Date.UTC(year, month - 1, 1))
  const endTs      = new Date(Date.UTC(year, month, 1))
  const daysInMonth = (endTs.getTime() - startTs.getTime()) / 86_400_000

  return {
    start:       startTs.toISOString(),
    end:         endTs.toISOString(),
    daysElapsed: day,
    daysInMonth,
    monthLabel:  now.toLocaleString('es-CL', { month: 'long', timeZone: TZ }) + ' ' + year,
  }
}
