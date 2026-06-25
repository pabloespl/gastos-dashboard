'use client'

import { Button } from '@/app/components/atoms/Button'

interface BulkCategoryBannerProps {
  merchant: string
  count: number
  categoryName: string
  onConfirm: () => void
  onDismiss: () => void
  pending?: boolean
}

export function BulkCategoryBanner({
  merchant,
  count,
  categoryName,
  onConfirm,
  onDismiss,
  pending = false,
}: BulkCategoryBannerProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-xl rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-lg">
        <p className="text-sm text-gray-700">
          Hay{' '}
          <span className="font-semibold">{count}</span>{' '}
          transacci{count === 1 ? 'ón' : 'ones'} de{' '}
          <span className="font-semibold">"{merchant}"</span>{' '}
          sin categorizar. ¿Asignar{' '}
          <span className="font-semibold">{categoryName}</span>{' '}
          a todas?
        </p>
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
