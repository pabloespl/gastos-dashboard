'use client'

export interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps {
  options: SelectOption[]
  value: string | number | null
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar',
  disabled = false,
  className = '',
}: SelectProps) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`rounded border border-gray-200 bg-white py-0.5 pl-1 pr-5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 disabled:opacity-50 cursor-pointer ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
