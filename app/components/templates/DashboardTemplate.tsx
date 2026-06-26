'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DashboardSummary } from '@/app/components/organisms/DashboardSummary'
import { TransactionTable } from '@/app/components/organisms/TransactionTable'
import { TransactionList } from '@/app/components/organisms/TransactionList'
import { BulkCategoryBanner } from '@/app/components/organisms/BulkCategoryBanner'
import { CategoryBreakdownCard } from '@/app/components/organisms/CategoryBreakdownCard'
import { DailySparklineCard } from '@/app/components/organisms/DailySparklineCard'
import { SignOutButton } from '@/app/components/sign-out-button'
import type {
  TransactionWithCategory,
  TransactionSummary,
  TransactionsPaginatedResponse,
} from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

const PAGE_SIZE = 20

interface BannerState {
  merchant: string
  count: number
  categoryId: number
  categoryName: string
}

interface DashboardTemplateProps {
  userEmail?: string
}

export function DashboardTemplate({ userEmail }: DashboardTemplateProps) {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [categories, setCategories]     = useState<Category[]>([])
  const [summary, setSummary]           = useState<TransactionSummary | null>(null)
  const [pagination, setPagination]     = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading]           = useState(true)
  const [banner, setBanner]             = useState<BannerState | null>(null)
  const [bulkPending, startBulkTransition] = useTransition()

  const fetchPage = useCallback(async (page: number) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/transactions?page=${page}`)
      if (!res.ok) return
      const json = (await res.json()) as TransactionsPaginatedResponse
      setTransactions(json.data)
      setSummary(json.summary)
      setPagination({
        page:       json.pagination.page,
        totalPages: json.pagination.totalPages,
        total:      json.pagination.total,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPage(1)
    void fetch('/api/categories')
      .then((r) => r.json())
      .then((cats: Category[]) => setCategories(cats))
  }, [fetchPage])

  const handleCategoryChange = useCallback(
    (messageId: string, categoryId: number, categoryName: string) => {
      setTransactions((prev) =>
        prev.map((t) =>
          t.message_id === messageId
            ? { ...t, category_id: categoryId, categories: { name: categoryName } }
            : t,
        ),
      )
    },
    [],
  )

  const handleBulkPrompt = useCallback(
    (merchant: string, count: number, categoryId: number, categoryName: string) => {
      setBanner({ merchant, count, categoryId, categoryName })
    },
    [],
  )

  const handleBulkConfirm = useCallback(() => {
    if (!banner) return
    startBulkTransition(async () => {
      const txn = transactions.find((t) => t.merchant === banner.merchant)
      if (!txn) { setBanner(null); return }

      const res = await fetch(`/api/transactions/${txn.message_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ category_id: banner.categoryId, apply_to_merchant: true }),
      })

      if (!res.ok) return

      setTransactions((prev) =>
        prev.map((t) =>
          t.merchant === banner.merchant && t.category_id === null
            ? { ...t, category_id: banner.categoryId, categories: { name: banner.categoryName } }
            : t,
        ),
      )
      setBanner(null)
    })
  }, [banner, transactions])

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

        {summary && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-text-muted">Cargando…</div>
          ) : (
            <>
              <TransactionList
                transactions={transactions}
                categories={categories}
                onCategoryChange={handleCategoryChange}
                onBulkPrompt={handleBulkPrompt}
              />
              <TransactionTable
                transactions={transactions}
                categories={categories}
                onCategoryChange={handleCategoryChange}
                onBulkPrompt={handleBulkPrompt}
              />
            </>
          )}

          {paginationBar}
        </div>
      </main>

      {banner && (
        <BulkCategoryBanner
          merchant={banner.merchant}
          count={banner.count}
          categoryName={banner.categoryName}
          onConfirm={handleBulkConfirm}
          onDismiss={() => setBanner(null)}
          pending={bulkPending}
        />
      )}
    </div>
  )
}
