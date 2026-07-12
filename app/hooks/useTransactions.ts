'use client'

import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCategories } from '@/app/hooks/useCategories'
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

async function fetchTransactions(month?: string): Promise<TransactionsResponse> {
  const url = month ? `/api/transactions?month=${encodeURIComponent(month)}` : '/api/transactions'
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al cargar transacciones')
  return res.json() as Promise<TransactionsResponse>
}

export function useTransactions(): UseTransactionsReturn {
  const [month, setMonth] = useState<string | undefined>(undefined)
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['transactions', month ?? 'current'],
    queryFn: () => fetchTransactions(month),
  })

  const categoriesQuery = useCategories()

  const fetchMonth = useCallback((m: string) => {
    setMonth(m)
  }, [])

  // REALTIME: This is the swap point for a Supabase Realtime subscription.
  // When ready, subscribe once (e.g. in a top-level effect) and drive updates
  // via the query cache instead of a manual refetch call:
  //
  //   useEffect(() => {
  //     const channel = supabase
  //       .channel('transactions-changes')
  //       .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' },
  //           () => queryClient.invalidateQueries({ queryKey: ['transactions'] }))
  //       .subscribe()
  //     return () => { void supabase.removeChannel(channel) }
  //   }, [queryClient])
  //
  // The `refetch` return value can stay — it's just backed by invalidateQueries
  // either way, so no consumer (TransactionTable / TransactionList / cards) needs
  // to change when this subscription is added.
  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }, [queryClient])

  return {
    transactions: query.data?.data ?? [],
    categories:   categoriesQuery.data ?? [],
    summary:      query.data?.summary ?? null,
    loading:      query.isLoading || query.isFetching,
    error:        query.isError ? 'Error al cargar transacciones' : null,
    refetch,
    fetchMonth,
  }
}
