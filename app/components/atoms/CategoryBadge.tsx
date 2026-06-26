export const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  'transporte':          'bg-cat-transporte-bg text-cat-transporte-text',
  'restaurantes':        'bg-cat-restaurantes-bg text-cat-restaurantes-text',
  'comida a domicilio':  'bg-cat-comida-bg text-cat-comida-text',
  'salud':               'bg-cat-salud-bg text-cat-salud-text',
  'supermercado':        'bg-cat-supermercado-bg text-cat-supermercado-text',
  'entretenimiento':     'bg-cat-entretenimiento-bg text-cat-entretenimiento-text',
  'suscripciones':       'bg-cat-suscripciones-bg text-cat-suscripciones-text',
  'otros':               'bg-cat-otros-bg text-cat-otros-text',
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
}

export function getBadgeClasses(name: string | null): string {
  if (!name) return 'bg-transparent text-text-muted border border-border'
  return CATEGORY_BADGE_CLASSES[name.toLowerCase()] ?? 'bg-cat-otros-bg text-cat-otros-text'
}

interface CategoryBadgeProps {
  name: string | null
}

export function CategoryBadge({ name }: CategoryBadgeProps) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${getBadgeClasses(name)}`}>
      {name ?? 'Sin categoría'}
    </span>
  )
}
