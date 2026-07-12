'use client'

import { useQuery } from '@tanstack/react-query'
import type { Category } from '@/src/types/category'

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories')
  if (!res.ok) throw new Error('Error al cargar categorías')
  return res.json() as Promise<Category[]>
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })
}
