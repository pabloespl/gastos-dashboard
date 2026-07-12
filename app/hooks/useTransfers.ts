'use client'

import { useState, useEffect, useCallback } from 'react'
import type { TransferWithCategory, TransfersResponse } from '@/src/types/transfer'
import type { Category } from '@/src/types/category'

interface UseTransfersReturn {
  transfers:  TransferWithCategory[]
  categories: Category[]
  loading:    boolean
  error:      string | null
  refetch:    () => void
}

export function useTransfers(): UseTransfersReturn {
  const [transfers, setTransfers]   = useState<TransferWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/transfers')
      if (!res.ok) { setError('Error al cargar transferencias'); return }
      const json = (await res.json()) as TransfersResponse
      setTransfers(json.data)
    } catch {
      setError('Error de red')
    } finally {
      setLoading(false)
    }
  }, [])

  const refetch = useCallback(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    void fetchData()
    void fetch('/api/categories')
      .then((r) => r.json())
      .then((cats: Category[]) => setCategories(cats))
  }, [fetchData])

  return { transfers, categories, loading, error, refetch }
}
