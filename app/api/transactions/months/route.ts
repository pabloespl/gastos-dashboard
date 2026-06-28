import { NextResponse } from 'next/server'
import { getDistinctMonths } from '@/src/models/transaction.model'
import type { MonthOption } from '@/src/types/transaction'

const TZ = 'America/Santiago'

export async function GET(): Promise<NextResponse> {
  try {
    const months = await getDistinctMonths()

    const options: MonthOption[] = months.map(yearMonth => {
      const [yearStr, monthStr] = yearMonth.split('-')
      const year  = parseInt(yearStr, 10)
      const month = parseInt(monthStr, 10)
      const midMonthTs = new Date(Date.UTC(year, month - 1, 15))
      const label = midMonthTs.toLocaleString('es-CL', { month: 'long', timeZone: TZ }) + ' ' + year
      return { value: yearMonth, label }
    })

    return NextResponse.json(options)
  } catch (err) {
    console.error('[transactions/months] GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
