import { Bus, UtensilsCrossed, Bike, Pill, ShoppingCart, Popcorn, RefreshCw, MoreHorizontal, Tag, Landmark, type LucideIcon } from 'lucide-react'

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'transporte':          Bus,
  'restaurantes':        UtensilsCrossed,
  'comida a domicilio':  Bike,
  'salud':               Pill,
  'supermercado':        ShoppingCart,
  'entretenimiento':     Popcorn,
  'suscripciones':       RefreshCw,
  'otros':               MoreHorizontal,
  'compras':             Tag,
  'gastos fijos':        Landmark,
}

export const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  'transporte':          'bg-cat-transporte-bg text-cat-transporte-text',
  'restaurantes':        'bg-cat-restaurantes-bg text-cat-restaurantes-text',
  'comida a domicilio':  'bg-cat-comida-bg text-cat-comida-text',
  'salud':               'bg-cat-salud-bg text-cat-salud-text',
  'supermercado':        'bg-cat-supermercado-bg text-cat-supermercado-text',
  'entretenimiento':     'bg-cat-entretenimiento-bg text-cat-entretenimiento-text',
  'suscripciones':       'bg-cat-suscripciones-bg text-cat-suscripciones-text',
  'otros':               'bg-cat-otros-bg text-cat-otros-text',
  'compras':             'bg-cat-compras-bg text-cat-compras-text',
  'gastos fijos':        'bg-cat-gastosfijos-bg text-cat-gastosfijos-text',
}

export const CATEGORY_BAR_CLASSES: Record<string, string> = {
  'transporte':          'bg-cat-transporte-bar',
  'restaurantes':        'bg-cat-restaurantes-bar',
  'comida a domicilio':  'bg-cat-comida-bar',
  'salud':               'bg-cat-salud-bar',
  'supermercado':        'bg-cat-supermercado-bar',
  'entretenimiento':     'bg-cat-entretenimiento-bar',
  'suscripciones':       'bg-cat-suscripciones-bar',
  'otros':               'bg-cat-otros-bar',
  'compras':             'bg-cat-compras-bar',
  'gastos fijos':        'bg-cat-gastosfijos-bar',
}

export function getBadgeClasses(name: string | null): string {
  if (!name) return 'bg-transparent text-text-muted border border-border'
  return CATEGORY_BADGE_CLASSES[name.toLowerCase()] ?? 'bg-cat-otros-bg text-cat-otros-text'
}

interface CategoryBadgeProps {
  name: string | null
  className?: string
}

export function CategoryBadge({ name, className = 'text-xs' }: CategoryBadgeProps) {
  const Icon = name ? CATEGORY_ICONS[name.toLowerCase()] : undefined
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${className} ${getBadgeClasses(name)}`}>
      {Icon && <Icon size={12} className="shrink-0" />}
      {name ?? 'Sin categoría'}
    </span>
  )
}
