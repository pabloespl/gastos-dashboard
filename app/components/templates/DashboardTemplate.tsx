'use client'

import { useState, useCallback, useTransition } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTransactions } from '@/app/hooks/useTransactions'
import { DashboardSummary } from '@/app/components/organisms/DashboardSummary'
import { TransactionTable } from '@/app/components/organisms/TransactionTable'
import { TransactionList } from '@/app/components/organisms/TransactionList'
import { BulkCategoryBanner } from '@/app/components/organisms/BulkCategoryBanner'
import { CategoryBreakdownCard } from '@/app/components/organisms/CategoryBreakdownCard'
import { DailySparklineCard } from '@/app/components/organisms/DailySparklineCard'
import { SignOutButton } from '@/app/components/sign-out-button'

const PAGE_SIZE = 20

interface BannerState {
  merchant:          string
  uncategorizedCount: number
  categorizedCount:   number
  categoryId:        number
  categoryName:      string
}

interface DashboardTemplateProps {
  userEmail?: string
}

export function DashboardTemplate({ userEmail }: DashboardTemplateProps) {
  const {
    transactions,
    categories,
    summary,
    pagination,
    loading,
    refetch,
    fetchPage,
  } = useTransactions()

  const [banner, setBanner]                = useState<BannerState | null>(null)
  const [bulkPending, startBulkTransition] = useTransition()

  // No-op: CategoryBadgeSelect/CategorySelect own their display state for immediate
  // feedback; the refetch triggered via onSuccess restores accuracy in the parent.
  const handleCategoryChange = useCallback(() => {}, [])

  const handleBulkPrompt = useCallback(
    (merchant: string, uncategorizedCount: number, categorizedCount: number, categoryId: number, categoryName: string) => {
      setBanner({ merchant, uncategorizedCount, categorizedCount, categoryId, categoryName })
    },
    [],
  )

  const handleBulkConfirm = useCallback(() => {
    if (!banner) return
    startBulkTransition(async () => {
      const txn = transactions.find((t) => t.merchant === banner.merchant)
      if (!txn) { setBanner(null); return }

      const body: Record<string, unknown> = { category_id: banner.categoryId }
      if (banner.uncategorizedCount > 0) body.apply_to_merchant = true
      if (banner.categorizedCount > 0) body.apply_to_merchant_override = true

      const res = await fetch(`/api/transactions/${txn.message_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (!res.ok) return
      setBanner(null)
      refetch()
    })
  }, [banner, transactions, refetch])

  const from = (pagination.page - 1) * PAGE_SIZE + 1
  const to   = Math.min(pagination.page * PAGE_SIZE, pagination.total)

  const paginationBar = pagination.totalPages > 1 && (
    <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-border bg-bg-card px-4 py-3 sm:px-6">
      <p className="text-xs text-text-muted">
        {from}–{to} de {pagination.total} transacciones
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => void fetchPage(pagination.page - 1)}
          disabled={pagination.page === 1 || loading}
          aria-label="Página anterior"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong text-text-secondary hover:bg-bg-secondary disabled:pointer-events-none disabled:border-border disabled:text-text-muted"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="min-w-[3rem] text-center text-xs tabular-nums text-text-secondary">
          {pagination.page} / {pagination.totalPages}
        </span>
        <button
          onClick={() => void fetchPage(pagination.page + 1)}
          disabled={pagination.page === pagination.totalPages || loading}
          aria-label="Página siguiente"
          className="flex h-7 w-7 items-center justify-center rounded-md border border-border-strong text-text-secondary hover:bg-bg-secondary disabled:pointer-events-none disabled:border-border disabled:text-text-muted"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-bg-secondary">
      <header className="border-b border-border-strong bg-bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-base sm:h-9 sm:w-9 sm:text-lg">
              💸
            </div>
            <span className="text-sm font-semibold text-text-primary">Gastos Dashboard</span>
          </div>
          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="hidden text-sm text-text-secondary sm:block">{userEmail}</span>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Dashboard de Gastos</h1>
          {summary && (
            <p className="mt-1 text-sm text-text-secondary capitalize">{summary.monthLabel}</p>
          )}
        </div>

        {summary && <DashboardSummary summary={summary} />}

        {/* Chart grid dims during any refetch so stale data is visually signalled.
            On initial load summary is null, so this block never renders while loading. */}
        {summary && (
          <div
            className={`grid grid-cols-1 gap-4 sm:grid-cols-2 transition-opacity duration-200 ${
              loading ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <CategoryBreakdownCard summary={summary} />
            <DailySparklineCard summary={summary} />
          </div>
        )}

        <div className="rounded-2xl border border-border bg-bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-text-primary">Transacciones</h2>
            {pagination.total > 0 && (
              <span className="text-xs text-text-muted">{pagination.total} en total</span>
            )}
          </div>

          {/* Show spinner only on initial load (no data yet).
              During a refetch the table stays visible; only the charts dim. */}
          {loading && transactions.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-text-muted">Cargando…</div>
          ) : (
            <>
              <TransactionList
                transactions={transactions}
                categories={categories}
                onCategoryChange={handleCategoryChange}
                onBulkPrompt={handleBulkPrompt}
                onSuccess={refetch}
              />
              <TransactionTable
                transactions={transactions}
                categories={categories}
                onCategoryChange={handleCategoryChange}
                onBulkPrompt={handleBulkPrompt}
                onSuccess={refetch}
              />
            </>
          )}

          {paginationBar}
        </div>
      </main>

      {banner && (
        <BulkCategoryBanner
          merchant={banner.merchant}
          uncategorizedCount={banner.uncategorizedCount}
          categorizedCount={banner.categorizedCount}
          categoryName={banner.categoryName}
          onConfirm={handleBulkConfirm}
          onDismiss={() => setBanner(null)}
          pending={bulkPending}
        />
      )}
    </div>
  )
}
