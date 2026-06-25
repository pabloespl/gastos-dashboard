'use client'

import { useState, useTransition, useEffect } from 'react'
import { Select } from '@/app/components/atoms/Select'
import type { Category } from '@/src/types/category'
import type { PatchTransactionResponse } from '@/src/types/transaction'

interface CategorySelectProps {
  messageId: string
  merchant: string
  categoryId: number | null
  categoryName: string | null
  categories: Category[]
  onCategoryChange: (messageId: string, categoryId: number, categoryName: string) => void
  onBulkPrompt: (merchant: string, count: number, categoryId: number, categoryName: string) => void
}

export function CategorySelect({
  messageId,
  merchant,
  categoryId,
  categoryName,
  categories,
  onCategoryChange,
  onBulkPrompt,
}: CategorySelectProps) {
  const [current, setCurrent] = useState<number | null>(categoryId)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setCurrent(categoryId)
  }, [categoryId])

  const options =
    categories.length > 0
      ? categories.map((c) => ({ value: c.id, label: c.name }))
      : current !== null && categoryName
        ? [{ value: current, label: categoryName }]
        : []

  function handleChange(val: string) {
    const parsed = val === '' ? null : parseInt(val, 10)
    const name = categories.find((c) => c.id === parsed)?.name ?? ''
    setCurrent(parsed)

    if (parsed === null) return

    startTransition(async () => {
      const res = await fetch(`/api/transactions/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_id: parsed }),
      })

      if (!res.ok) return

      const json = (await res.json()) as PatchTransactionResponse
      onCategoryChange(messageId, parsed, name)

      if (json.uncategorizedSiblings > 0) {
        onBulkPrompt(merchant, json.uncategorizedSiblings, parsed, name)
      }
    })
  }

  return (
    <Select
      options={options}
      value={current}
      onChange={handleChange}
      placeholder="Sin categoría"
      disabled={pending}
    />
  )
}
