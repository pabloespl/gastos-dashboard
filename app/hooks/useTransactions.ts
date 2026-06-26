'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  TransactionWithCategory,
  TransactionSummary,
  TransactionsPaginatedResponse,
} from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

interface UseTransactionsReturn {
  transactions: TransactionWithCategory[]
  categories:   Category[]
  summary:      TransactionSummary | null
  pagination:   { page: number; totalPages: number; total: number }
  loading:      boolean
  error:        string | null
  refetch:      () => void
  fetchPage:    (page: number) => void
}

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [categories, setCategories]     = useState<Category[]>([])
  const [summary, setSummary]           = useState<TransactionSummary | null>(null)
  const [pagination, setPagination]     = useState({ page: 1, totalPages: 1, total: 0 })
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const currentPageRef = useRef(1)

  const fetchPage = useCallback(async (page: number) => {
    currentPageRef.current = page
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/transactions?page=${page}`)
      if (!res.ok) { setError('Error al cargar transacciones'); return }
      const json = (await res.json()) as TransactionsPaginatedResponse
      setTransactions(json.data)
      setSummary(json.summary)
      setPagination({
        page:       json.pagination.page,
        totalPages: json.pagination.totalPages,
        total:      json.pagination.total,
      })
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  // REALTIME: This is the swap point for a Supabase Realtime subscription.
  // When ready, replace the refetch() call with a channel that auto-drives updates:
  //
  //   useEffect(() => {
  //     const channel = supabase
  //       .channel('transactions-changes')
  //       .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' },
  //           () => void fetchPage(currentPageRef.current))
  //       .subscribe()
  //     return () => { void supabase.removeChannel(channel) }
  //   }, [fetchPage])
  //
  // Once the subscription is wired, remove the `refetch` return value and the
  // `onSuccess` prop threading from TransactionTable / TransactionList / cards.
  const refetch = useCallback(() => {
    void fetchPage(currentPageRef.current)
  }, [fetchPage])

  useEffect(() => {
    void fetchPage(1)
    void fetch('/api/categories')
      .then((r) => r.json())
      .then((cats: Category[]) => setCategories(cats))
  }, [fetchPage])

  return { transactions, categories, summary, pagination, loading, error, refetch, fetchPage }
}
