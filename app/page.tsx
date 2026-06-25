import { Suspense } from 'react'
import { createServerClient } from '@/app/lib/supabase/server'
import { SignOutButton } from '@/app/components/sign-out-button'
import { Pagination } from '@/app/components/pagination'
import { CategorySelect } from '@/app/components/CategorySelect'

const PAGE_SIZE = 20
const TZ = 'America/Santiago'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonthBounds() {
  const now = new Date()
  // Extract current date components in Chile timezone
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const year  = parseInt(parts.find(p => p.type === 'year')!.value)
  const month = parseInt(parts.find(p => p.type === 'month')!.value) // 1-indexed
  const day   = parseInt(parts.find(p => p.type === 'day')!.value)

  return {
    start:       new Date(Date.UTC(year, month - 1, 1)).toISOString(),
    end:         new Date(Date.UTC(year, month, 1)).toISOString(),
    daysElapsed: day,
    monthLabel:  now.toLocaleString('es-CL', { month: 'long', year: 'numeric', timeZone: TZ }),
  }
}

function formatCLP(n: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatChileDate(iso: string) {
  return new Date(iso).toLocaleString('es-CL', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────

type PageProps = { searchParams: Promise<{ page?: string }> }

export default async function DashboardPage({ searchParams }: PageProps) {
  const { page: pageParam } = await searchParams
  const page     = Math.max(1, parseInt(pageParam ?? '1', 10))
  const from     = (page - 1) * PAGE_SIZE
  const to       = from + PAGE_SIZE - 1

  const { start, end, daysElapsed, monthLabel } = getMonthBounds()

  const supabase = await createServerClient()

  const [{ data: { user } }, summaryRes, tableRes, categoriesRes] = await Promise.all([
    supabase.auth.getUser(),

    supabase
      .from('transactions')
      .select('amount, currency, category_id')
      .gte('datetime', start)
      .lt('datetime', end),

    supabase
      .from('transactions')
      .select('message_id, datetime, merchant, amount, currency, card_last4, category_id', { count: 'exact' })
      .order('datetime', { ascending: false })
      .range(from, to),

    supabase
      .from('categories')
      .select('id, name')
      .order('name'),
  ])

  // ── Summary stats ────────────────────────────────────────────────────────

  const monthTxns = summaryRes.data ?? []
  const clpTotal  = monthTxns
    .filter(t => t.currency === 'CLP')
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)
  const usdTotal  = monthTxns
    .filter(t => t.currency === 'USD')
    .reduce((sum, t) => sum + (t.amount ?? 0), 0)
  const txnCount  = monthTxns.length
  const avgPerDay = daysElapsed > 0 ? clpTotal / daysElapsed : 0

  const catFreq: Record<string, number> = {}
  for (const t of monthTxns) {
    if (t.category_id) catFreq[t.category_id] = (catFreq[t.category_id] ?? 0) + 1
  }
  const topCategory = Object.entries(catFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // ── Table ────────────────────────────────────────────────────────────────

  const transactions = tableRes.data ?? []
  const totalCount   = tableRes.count ?? 0
  const totalPages   = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const categories   = categoriesRes.data ?? []

  const summaryCards = [
    {
      label: 'Total del mes',
      value: txnCount === 0 ? '—' : formatCLP(clpTotal),
      sub:   usdTotal > 0 ? `+ USD ${usdTotal.toFixed(2)} por separado` : monthLabel,
    },
    {
      label: 'Transacciones',
      value: txnCount === 0 ? '—' : String(txnCount),
      sub:   monthLabel,
    },
    {
      label: 'Categoría top',
      value: topCategory ?? '—',
      sub:   topCategory ? `${catFreq[topCategory]} transacciones` : 'Sin categorías aún',
    },
    {
      label: 'Promedio por día',
      value: txnCount === 0 ? '—' : formatCLP(avgPerDay),
      sub:   `${daysElapsed} días transcurridos`,
    },
  ]

  const TABLE_COLUMNS = ['Fecha', 'Comercio', 'Monto', 'Moneda', 'Categoría', 'Tarjeta']

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-base sm:h-9 sm:w-9 sm:text-lg">
              💸
            </div>
            <span className="text-sm font-semibold text-gray-900">Gastos Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-gray-500 sm:block">{user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        {/* Título */}
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Dashboard de Gastos</h1>
          <p className="mt-1 text-sm text-gray-500 capitalize">{monthLabel}</p>
        </div>

        {/* Cards de resumen — 2×2 en móvil, 4 en fila en sm+ */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {card.label}
              </p>
              <p className="mt-2 text-lg font-bold text-gray-900 sm:text-2xl">{card.value}</p>
              <p className="mt-1 text-xs text-gray-400">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Transacciones */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-gray-900">Transacciones</h2>
            {totalCount > 0 && (
              <span className="text-xs text-gray-400">{totalCount} en total</span>
            )}
          </div>

          {/* Vista de tarjetas — solo en móvil */}
          <div className="sm:hidden divide-y divide-gray-50">
            {transactions.length === 0 ? (
              <p className="px-4 py-12 text-center text-sm text-gray-400">
                No hay transacciones registradas aún.
              </p>
            ) : (
              transactions.map((t) => (
                <div key={t.message_id} className="flex items-start justify-between px-4 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">{t.merchant ?? '—'}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <CategorySelect
                        messageId={t.message_id}
                        categoryId={t.category_id}
                        categories={categories}
                      />
                      <span className="text-xs text-gray-400">
                        {t.datetime ? formatChileDate(t.datetime) : '—'}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4 shrink-0 text-right">
                    <p className="font-semibold text-gray-900 whitespace-nowrap">
                      {t.amount != null
                        ? t.currency === 'CLP'
                          ? formatCLP(t.amount)
                          : `USD ${t.amount.toFixed(2)}`
                        : '—'}
                    </p>
                    <span className="mt-0.5 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">
                      {t.currency ?? '—'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Vista de tabla — solo en sm+ */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {TABLE_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-400"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={TABLE_COLUMNS.length}
                      className="px-6 py-12 text-center text-sm text-gray-400"
                    >
                      No hay transacciones registradas aún.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.message_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                        {t.datetime ? formatChileDate(t.datetime) : '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-900 font-medium">
                        {t.merchant ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-900 whitespace-nowrap">
                        {t.amount != null
                          ? t.currency === 'CLP'
                            ? formatCLP(t.amount)
                            : `${t.currency} ${t.amount.toFixed(2)}`
                          : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {t.currency ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <CategorySelect
                          messageId={t.message_id}
                          categoryId={t.category_id}
                          categories={categories}
                        />
                      </td>
                      <td className="px-6 py-3 text-gray-500 font-mono text-xs">
                        {t.card_last4 ? `···· ${t.card_last4}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Suspense>
            <Pagination currentPage={page} totalPages={totalPages} />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
