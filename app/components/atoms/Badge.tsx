interface BadgeProps {
  label: string
  variant?: 'default' | 'indigo'
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-bg-secondary text-text-secondary',
    indigo:  'bg-primary-light text-primary',
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${variants[variant]}`}>
      {label}
    </span>
  )
}
