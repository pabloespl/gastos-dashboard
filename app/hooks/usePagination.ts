'use client'

import { useState, useMemo, useCallback } from 'react'

export interface PaginationState {
  page: number
  pageSize: number
  totalPages: number
  totalItems: number
}

interface UsePaginationReturn<T> extends PaginationState {
  paginatedItems: T[]
  goTo: (page: number) => void
  next: () => void
  prev: () => void
  setPageSize: (n: number) => void
}

export function usePagination<T>(
  items: T[],
  defaultPageSize = 20,
): UsePaginationReturn<T> {
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSizeState] = useState(defaultPageSize)

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))

  const safePage = Math.min(page, totalPages)

  const paginatedItems = useMemo(() => {
    const from = (safePage - 1) * pageSize
    return items.slice(from, from + pageSize)
  }, [items, safePage, pageSize])

  const goTo = useCallback((p: number) => {
    setPage(Math.max(1, p))
  }, [])

  const next = useCallback(() => {
    setPage(p => Math.min(p + 1, totalPages))
  }, [totalPages])

  const prev = useCallback(() => {
    setPage(p => Math.max(p - 1, 1))
  }, [])

  const setPageSize = useCallback((n: number) => {
    setPageSizeState(n)
    setPage(1)
  }, [])

  return {
    paginatedItems,
    page: safePage,
    pageSize,
    totalPages,
    totalItems: items.length,
    goTo,
    next,
    prev,
    setPageSize,
  }
}
