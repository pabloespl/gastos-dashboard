'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCategories } from '@/app/hooks/useCategories'
import type { TransferWithCategory, TransfersResponse } from '@/src/types/transfer'
import type { Category } from '@/src/types/category'

interface UseTransfersReturn {
  transfers:  TransferWithCategory[]
  categories: Category[]
  loading:    boolean
  error:      string | null
  refetch:    () => void
}

async function fetchTransfers(): Promise<TransfersResponse> {
  const res = await fetch('/api/transfers')
  if (!res.ok) throw new Error('Error al cargar transferencias')
  return res.json() as Promise<TransfersResponse>
}

export function useTransfers(): UseTransfersReturn {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['transfers'],
    queryFn: fetchTransfers,
  })

  const categoriesQuery = useCategories()

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['transfers'] })
  }, [queryClient])

  return {
    transfers:  query.data?.data ?? [],
    categories: categoriesQuery.data ?? [],
    loading:    query.isLoading || query.isFetching,
    error:      query.isError ? 'Error al cargar transferencias' : null,
    refetch,
  }
}
