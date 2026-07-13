'use client'

import { useState, useMemo, useRef } from 'react'
import type { TransactionWithCategory } from '@/src/types/transaction'
import { getCurrentYearMonth } from '@/app/lib/utils'

export interface TransactionFilters {
  category: string   // numeric id | "uncategorized" | ""
  merchant: string
  month: string      // YYYY-MM
  currency: string   // "" | "CLP" | "USD"
}

interface UseTransactionFiltersReturn {
  filters: TransactionFilters
  setFilters: (filters: TransactionFilters) => void
  filteredTransactions: TransactionWithCategory[]
  hasActiveFilters: boolean
}

export function useTransactionFilters(
  transactions: TransactionWithCategory[],
): UseTransactionFiltersReturn {
  const defaultMonthRef = useRef(getCurrentYearMonth())

  const [filters, setFilters] = useState<TransactionFilters>({
    category: '',
    merchant: '',
    month: defaultMonthRef.current,
    currency: '',
  })

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (filters.category === 'uncategorized') {
        if (t.category_id !== null) return false
      } else if (filters.category !== '') {
        if (t.category_id !== parseInt(filters.category, 10)) return false
      }

      if (filters.merchant !== '') {
        if (!t.merchant.toLowerCase().includes(filters.merchant.toLowerCase())) return false
      }

      if (filters.currency !== '') {
        if (t.currency !== filters.currency) return false
      }

      return true
    })
  }, [transactions, filters])

  const hasActiveFilters =
    filters.category !== '' ||
    filters.merchant !== '' ||
    filters.month !== defaultMonthRef.current ||
    filters.currency !== ''

  return { filters, setFilters, filteredTransactions, hasActiveFilters }
}
