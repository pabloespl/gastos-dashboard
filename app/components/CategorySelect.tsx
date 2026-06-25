'use client'

import { useState, useTransition } from 'react'
import { updateCategory } from '@/app/actions/updateCategory'

type Category = { id: number; name: string }

type Props = {
  messageId: string
  categoryId: number | null
  categoryName: string | null
  categories: Category[]
}

export function CategorySelect({ messageId, categoryId, categoryName, categories }: Props) {
  const [current, setCurrent] = useState<number | null>(categoryId)
  const [currentName, setCurrentName] = useState<string | null>(categoryName)
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value === '' ? null : parseInt(e.target.value, 10)
    const name = categories.find(c => c.id === val)?.name ?? null
    setCurrent(val)
    setCurrentName(name)
    startTransition(async () => {
      await updateCategory(messageId, val)
    })
  }

  // Si aún no hay opciones cargadas, muestra el nombre del join como opción inicial
  const options = categories.length > 0
    ? categories
    : current && currentName
      ? [{ id: current, name: currentName }]
      : []

  return (
    <select
      value={current ?? ''}
      onChange={handleChange}
      disabled={pending}
      className="rounded border border-gray-200 bg-white py-0.5 pl-1 pr-5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50 cursor-pointer"
    >
      <option value="">Sin categoría</option>
      {options.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )
}
