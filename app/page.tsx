import { createServerClient } from '@/app/lib/supabase/server'
import { SignOutButton } from '@/app/components/sign-out-button'

const SUMMARY_CARDS = [
  { label: 'Total del mes', value: '—', sub: 'Sin datos aún' },
  { label: 'Transacciones', value: '—', sub: 'Sin datos aún' },
  { label: 'Categoría top', value: '—', sub: 'Sin datos aún' },
  { label: 'Promedio por día', value: '—', sub: 'Sin datos aún' },
]

const TABLE_COLUMNS = ['Fecha', 'Comercio', 'Monto', 'Moneda', 'Categoría', 'Tarjeta']

export default async function DashboardPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg">
              💸
            </div>
            <span className="text-sm font-semibold text-gray-900">Gastos Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Gastos</h1>
          <p className="mt-1 text-sm text-gray-500">Resumen de tus transacciones</p>
        </div>

        {/* Cards de resumen */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SUMMARY_CARDS.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                {card.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="mt-1 text-xs text-gray-400">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabla de transacciones */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Transacciones</h2>
          </div>
          <div className="overflow-x-auto">
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
              <tbody>
                <tr>
                  <td
                    colSpan={TABLE_COLUMNS.length}
                    className="px-6 py-12 text-center text-sm text-gray-400"
                  >
                    No hay transacciones registradas aún.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
