'use client'

import { useState, useTransition } from 'react'
import { updateCategory } from '@/app/actions/updateCategory'

type Category = { id: number; name: string }

type Props = {
  messageId: string
  categoryId: number | null
  categories: Category[]
}

export function CategorySelect({ messageId, categoryId, categories }: Props) {
  const [current, setCurrent] = useState<number | null>(categoryId)
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value === '' ? null : parseInt(e.target.value, 10)
    setCurrent(val)
    startTransition(async () => {
      await updateCategory(messageId, val)
    })
  }

  return (
    <select
      value={current ?? ''}
      onChange={handleChange}
      disabled={pending}
      className="rounded border border-gray-200 bg-white py-0.5 pl-1 pr-5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50 cursor-pointer"
    >
      <option value="">Sin categoría</option>
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )
}
