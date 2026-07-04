'use client'

import { useState, useCallback, useEffect, useTransition } from 'react'
import { useTransactions } from '@/app/hooks/useTransactions'
import { useTransactionFilters } from '@/app/hooks/useTransactionFilters'
import type { TransactionFilters } from '@/app/hooks/useTransactionFilters'
import { usePagination } from '@/app/hooks/usePagination'
import { DashboardSummary } from '@/app/components/organisms/DashboardSummary'
import { TransactionTable } from '@/app/components/organisms/TransactionTable'
import { TransactionList } from '@/app/components/organisms/TransactionList'
import { BulkCategoryBanner } from '@/app/components/organisms/BulkCategoryBanner'
import { CategoryBreakdownCard } from '@/app/components/organisms/CategoryBreakdownCard'
import { DailySparklineCard } from '@/app/components/organisms/DailySparklineCard'
import { UserMenu } from '@/app/components/UserMenu'
import { ToggleAmountsButton } from '@/app/components/atoms/ToggleAmountsButton'
import { FilterBar } from '@/app/components/molecules/FilterBar'
import { PaginationBar } from '@/app/components/molecules/PaginationBar'
import type { MonthOption } from '@/src/types/transaction'

interface BannerState {
  messageId:          string
  merchant:           string
  uncategorizedCount: number
  categorizedCount:   number
  categoryId:         number
  categoryName:       string
}

interface DashboardTemplateProps {
  userEmail?: string
  fullName?: string | null
}

export function DashboardTemplate({ userEmail, fullName = null }: DashboardTemplateProps) {
  const {
    transactions,
    categories,
    summary,
    loading,
    refetch,
    fetchMonth,
  } = useTransactions()

  const { filters, setFilters, filteredTransactions, hasActiveFilters } =
    useTransactionFilters(transactions)

  const {
    paginatedItems,
    page,
    pageSize,
    totalPages,
    goTo,
    next,
    prev,
    setPageSize,
  } = usePagination(filteredTransactions, 10)

  const [months, setMonths]                = useState<MonthOption[]>([])
  const [banner, setBanner]                = useState<BannerState | null>(null)
  const [bulkPending, startBulkTransition] = useTransition()

  useEffect(() => {
    void fetch('/api/transactions/months')
      .then(r => r.json())
      .then((data: MonthOption[]) => setMonths(data))
  }, [])

  const handleFiltersChange = useCallback(
    (newFilters: TransactionFilters) => {
      if (newFilters.month !== filters.month) {
        fetchMonth(newFilters.month)
      }
      setFilters(newFilters)
      goTo(1)
    },
    [filters.month, fetchMonth, setFilters, goTo],
  )

  // No-op: CategorySelect owns its display state for immediate
  // feedback; the refetch triggered via onSuccess restores accuracy in the parent.
  const handleCategoryChange = useCallback(() => {}, [])

  const handleBulkPrompt = useCallback(
    (messageId: string, merchant: string, uncategorizedCount: number, categorizedCount: number, categoryId: number, categoryName: string) => {
      if (uncategorizedCount + categorizedCount === 0) return
      setBanner({ messageId, merchant, uncategorizedCount, categorizedCount, categoryId, categoryName })
    },
    [],
  )

  const handleBulkConfirm = useCallback(() => {
    if (!banner) return
    startBulkTransition(async () => {
      const hasNeither = banner.uncategorizedCount === 0 && banner.categorizedCount === 0
      const body: Record<string, unknown> = { category_id: banner.categoryId }
      if (hasNeither) {
        body.force_all = true
      } else {
        if (banner.uncategorizedCount > 0) body.apply_to_merchant = true
        if (banner.categorizedCount > 0) body.apply_to_merchant_override = true
      }

      const res = await fetch(`/api/transactions/${banner.messageId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (!res.ok) return
      setBanner(null)
      refetch()
    })
  }, [banner, refetch])

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
            <ToggleAmountsButton />
            <UserMenu email={userEmail ?? ''} fullName={fullName} />
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
            <DailySparklineCard summary={summary} monthStart={filters.month} />
          </div>
        )}

        <div className="rounded-2xl border border-border bg-bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-text-primary">Transacciones</h2>
            {transactions.length > 0 && (
              <span className="text-xs text-text-muted">
                {hasActiveFilters
                  ? `${filteredTransactions.length} de ${transactions.length}`
                  : `${transactions.length} en total`}
              </span>
            )}
          </div>

          <FilterBar
            categories={categories}
            months={months}
            filters={filters}
            onChange={handleFiltersChange}
            hasActiveFilters={hasActiveFilters}
          />

          {/* Show spinner only on initial load (no data yet).
              During a refetch the table stays visible; only the charts dim. */}
          {loading && transactions.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-text-muted">Cargando…</div>
          ) : (
            <>
              <TransactionList
                transactions={paginatedItems}
                categories={categories}
                onCategoryChange={handleCategoryChange}
                onBulkPrompt={handleBulkPrompt}
                onSuccess={refetch}
              />
              <TransactionTable
                transactions={paginatedItems}
                categories={categories}
                onCategoryChange={handleCategoryChange}
                onBulkPrompt={handleBulkPrompt}
                onSuccess={refetch}
              />
            </>
          )}

          {filteredTransactions.length > 0 && (
            <PaginationBar
              page={page}
              pageSize={pageSize}
              totalPages={totalPages}
              totalItems={filteredTransactions.length}
              onPrev={prev}
              onNext={next}
              onPageSizeChange={setPageSize}
            />
          )}
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
