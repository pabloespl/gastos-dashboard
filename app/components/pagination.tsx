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
    <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
      <p className="text-xs text-gray-400">
        Página {currentPage} de {totalPages}
      </p>
      <div className="flex gap-2">
        <Link
          href={pageHref(currentPage - 1)}
          aria-disabled={currentPage === 1}
          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
            currentPage === 1
              ? 'pointer-events-none border-gray-100 text-gray-300'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Anterior
        </Link>
        <Link
          href={pageHref(currentPage + 1)}
          aria-disabled={currentPage === totalPages}
          className={`rounded-lg border px-3 py-1.5 text-xs transition ${
            currentPage === totalPages
              ? 'pointer-events-none border-gray-100 text-gray-300'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Siguiente
        </Link>
      </div>
    </div>
  )
}
