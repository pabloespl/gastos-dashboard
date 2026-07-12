'use client'

import { useCallback } from 'react'
import { useTransfers } from '@/app/hooks/useTransfers'
import { NavToggle } from '@/app/components/organisms/Sidebar'
import { TransferTable } from '@/app/components/organisms/TransferTable'
import { TransferList } from '@/app/components/organisms/TransferList'
import { UserMenu } from '@/app/components/UserMenu'
import { ToggleAmountsButton } from '@/app/components/atoms/ToggleAmountsButton'

interface TransfersTemplateProps {
  userEmail?: string
  fullName?: string | null
}

export function TransfersTemplate({ userEmail, fullName = null }: TransfersTemplateProps) {
  const { transfers, categories, loading, refetch } = useTransfers()

  // No-op: CategorySelect owns its display state for immediate
  // feedback; the refetch triggered via onSuccess restores accuracy in the parent.
  const handleCategoryChange = useCallback(() => {}, [])

  return (
    <div className="min-h-screen bg-bg-secondary">
      <header className="border-b border-border-strong bg-bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <NavToggle />
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-base">
              💸
            </div>
            <span className="truncate text-sm font-semibold text-text-primary">Transferencias</span>
          </div>
          <div className="flex items-center gap-3">
            <ToggleAmountsButton />
            <UserMenu email={userEmail ?? ''} fullName={fullName} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Transferencias</h1>
          <p className="mt-1 text-sm text-text-secondary">Transferencias bancarias del mes actual</p>
        </div>

        <div className="rounded-2xl border border-border bg-bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
            <h2 className="text-sm font-semibold text-text-primary">Transferencias</h2>
            {transfers.length > 0 && (
              <span className="text-xs text-text-muted">{transfers.length} en total</span>
            )}
          </div>

          {loading && transfers.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-text-muted">Cargando…</div>
          ) : (
            <>
              <TransferList
                transfers={transfers}
                categories={categories}
                onCategoryChange={handleCategoryChange}
                onSuccess={refetch}
              />
              <TransferTable
                transfers={transfers}
                categories={categories}
                onCategoryChange={handleCategoryChange}
                onSuccess={refetch}
              />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
