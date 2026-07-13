import type { Category } from '@/src/types/category'

const TZ = 'America/Santiago'

export function sortCategoriesWithOtrosLast(categories: Category[]): Category[] {
  const otros  = categories.filter(c => c.name === 'Otros')
  const rest   = categories.filter(c => c.name !== 'Otros').sort((a, b) => a.name.localeCompare(b.name, 'es'))
  return [...rest, ...otros]
}

export function formatCLP(n: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatChileDate(iso: string): string {
  const hour12 =
    typeof window !== 'undefined'
      ? Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12
      : undefined
  return new Date(iso).toLocaleString('es-CL', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(hour12 !== undefined && { hour12 }),
  })
}

export function formatChileDateShort(iso: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))

  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '00'
  return `${get('day')}-${get('month')}, ${get('hour')}:${get('minute')}`
}

export interface MonthBounds {
  start: string
  end: string
  daysElapsed: number
  daysInMonth: number
  monthLabel: string
}

export function getCurrentYearMonth(): string {
  return new Intl.DateTimeFormat('sv', { timeZone: TZ })
    .format(new Date())
    .substring(0, 7)
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

export function getMonthBoundsFor(yearMonth: string): MonthBounds {
  const [yearStr, monthStr] = yearMonth.split('-')
  const year  = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)

  const currentYearMonth = getCurrentYearMonth()

  const startTs     = new Date(Date.UTC(year, month - 1, 1))
  const endTs       = new Date(Date.UTC(year, month, 1))
  const daysInMonth = (endTs.getTime() - startTs.getTime()) / 86_400_000

  let daysElapsed: number
  if (yearMonth === currentYearMonth) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      day: '2-digit',
    }).formatToParts(new Date())
    daysElapsed = parseInt(parts.find(p => p.type === 'day')!.value, 10)
  } else {
    daysElapsed = daysInMonth
  }

  const midMonthTs = new Date(Date.UTC(year, month - 1, 15))
  const monthLabel = midMonthTs.toLocaleString('es-CL', { month: 'long', timeZone: TZ }) + ' ' + year

  return {
    start: startTs.toISOString(),
    end:   endTs.toISOString(),
    daysElapsed,
    daysInMonth,
    monthLabel,
  }
}
