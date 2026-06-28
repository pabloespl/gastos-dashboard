'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  TransactionWithCategory,
  TransactionSummary,
  TransactionsResponse,
} from '@/src/types/transaction'
import type { Category } from '@/src/types/category'

interface UseTransactionsReturn {
  transactions: TransactionWithCategory[]
  categories:   Category[]
  summary:      TransactionSummary | null
  loading:      boolean
  error:        string | null
  refetch:      () => void
  fetchMonth:   (month: string) => void
}

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>([])
  const [categories, setCategories]     = useState<Category[]>([])
  const [summary, setSummary]           = useState<TransactionSummary | null>(null)
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)

  const currentMonthRef = useRef<string | undefined>(undefined)

  const fetchData = useCallback(async (month?: string) => {
    currentMonthRef.current = month
    setLoading(true)
    setError(null)
    try {
      const url = month ? `/api/transactions?month=${encodeURIComponent(month)}` : '/api/transactions'
      const res = await fetch(url)
      if (!res.ok) { setError('Error al cargar transacciones'); return }
      const json = (await res.json()) as TransactionsResponse
      setTransactions(json.data)
      setSummary(json.summary)
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMonth = useCallback((month: string) => {
    void fetchData(month)
  }, [fetchData])

  // REALTIME: This is the swap point for a Supabase Realtime subscription.
  // When ready, replace the refetch() call with a channel that auto-drives updates:
  //
  //   useEffect(() => {
  //     const channel = supabase
  //       .channel('transactions-changes')
  //       .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' },
  //           () => void fetchData(currentMonthRef.current))
  //       .subscribe()
  //     return () => { void supabase.removeChannel(channel) }
  //   }, [fetchData])
  //
  // Once the subscription is wired, remove the `refetch` return value and the
  // `onSuccess` prop threading from TransactionTable / TransactionList / cards.
  const refetch = useCallback(() => {
    void fetchData(currentMonthRef.current)
  }, [fetchData])

  useEffect(() => {
    void fetchData(undefined)
    void fetch('/api/categories')
      .then((r) => r.json())
      .then((cats: Category[]) => setCategories(cats))
  }, [fetchData])

  return { transactions, categories, summary, loading, error, refetch, fetchMonth }
}
