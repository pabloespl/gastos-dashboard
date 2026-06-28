'use client'

import type React from 'react'
import { Button } from '@/app/components/atoms/Button'

interface BulkCategoryBannerProps {
  merchant: string
  uncategorizedCount: number
  categorizedCount: number
  categoryName: string
  onConfirm: () => void
  onDismiss: () => void
  pending?: boolean
}

export function BulkCategoryBanner({
  merchant,
  uncategorizedCount,
  categorizedCount,
  categoryName,
  onConfirm,
  onDismiss,
  pending = false,
}: BulkCategoryBannerProps) {
  const hasBoth = uncategorizedCount > 0 && categorizedCount > 0

  let message: React.ReactNode
  if (hasBoth) {
    message = (
      <>
        Hay{' '}
        <span className="font-semibold">{uncategorizedCount}</span> sin categoría y{' '}
        <span className="font-semibold">{categorizedCount}</span> con otra categoría de{' '}
        <span className="font-semibold">&quot;{merchant}&quot;</span>.{' '}
        ¿Asignar <span className="font-semibold">{categoryName}</span> a todas?
      </>
    )
  } else if (uncategorizedCount > 0) {
    message = (
      <>
        Hay{' '}
        <span className="font-semibold">{uncategorizedCount}</span>{' '}
        transacci{uncategorizedCount === 1 ? 'ón' : 'ones'} de{' '}
        <span className="font-semibold">&quot;{merchant}&quot;</span>{' '}
        sin categorizar. ¿Asignar{' '}
        <span className="font-semibold">{categoryName}</span> a todas?
      </>
    )
  } else {
    message = (
      <>
        Hay{' '}
        <span className="font-semibold">{categorizedCount}</span>{' '}
        transacci{categorizedCount === 1 ? 'ón' : 'ones'} de{' '}
        <span className="font-semibold">&quot;{merchant}&quot;</span>{' '}
        con otra categoría. ¿Aplicar{' '}
        <span className="font-semibold">{categoryName}</span> también a ellas?
      </>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-border-strong bg-bg-card px-5 py-4 shadow-lg">
        <p className="text-sm text-text-primary">{message}</p>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onDismiss} disabled={pending}>
            No, solo esta
          </Button>
          <Button variant="primary" size="sm" onClick={onConfirm} disabled={pending}>
            {pending ? 'Asignando…' : 'Sí, asignar a todas'}
          </Button>
        </div>
      </div>
    </div>
  )
}
