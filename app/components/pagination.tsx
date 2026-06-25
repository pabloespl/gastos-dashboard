'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

type Props = {
  currentPage: number
  totalPages: number
}

export function Pagination({ currentPage, totalPages }: Props) {
  const searchParams = useSearchParams()

  function pageHref(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    return `?${params.toString()}`
  }

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 sm:px-6 sm:py-4">
      <p className="text-xs text-gray-400">
        Página {currentPage} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Link
          href={pageHref(currentPage - 1)}
          aria-disabled={currentPage === 1}
          className={`inline-flex min-h-[44px] min-w-[80px] items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition sm:min-h-0 sm:min-w-0 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-xs ${
            currentPage === 1
              ? 'pointer-events-none border-gray-100 text-gray-300'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100'
          }`}
        >
          ← Anterior
        </Link>
        <Link
          href={pageHref(currentPage + 1)}
          aria-disabled={currentPage === totalPages}
          className={`inline-flex min-h-[44px] min-w-[80px] items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition sm:min-h-0 sm:min-w-0 sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-xs ${
            currentPage === totalPages
              ? 'pointer-events-none border-gray-100 text-gray-300'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100'
          }`}
        >
          Siguiente →
        </Link>
      </div>
    </div>
  )
}
