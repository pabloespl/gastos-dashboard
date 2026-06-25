interface BadgeProps {
  label: string
  variant?: 'default' | 'indigo'
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-gray-100 text-gray-600',
    indigo:  'bg-indigo-50 text-indigo-600',
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {label}
    </span>
  )
}
