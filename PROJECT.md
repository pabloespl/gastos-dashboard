# Estado del proyecto

## COMPLETO

- Autenticación: Google OAuth via Supabase, SSR con cookies, whitelist por env NEXT_PUBLIC_ALLOWED_EMAIL, middleware de rutas, RLS en Supabase
- Dashboard: summary cards (total CLP+USD, N° transacciones, top categoría, promedio/día), category breakdown con barras, daily sparkline 25 días con proyección. Layout responsive mobile/desktop.
- Transacciones: listado paginado (20/página), tabla desktop + cards mobile, categorización individual (CategoryBadgeSelect / CategorySelect) y bulk (detección automática de siblings, banner de confirmación, apply_to_merchant)
- API Routes: GET /api/transactions (paginado + summary), PATCH /api/transactions/[message_id] — flujo bulk de dos pasos: primera llamada con apply_to_merchant: false devuelve uncategorizedSiblings; si > 0, segunda llamada con apply_to_merchant: true confirma el bulk. GET /api/categories.
- Sincronización: sync.js lee Google Sheets (service account) y hace upsert a Supabase con sync incremental via last_sync.txt. GitHub Actions con trigger manual (workflow_dispatch).

## PENDIENTE

- Notificaciones: scripts/notify-summary.js existe pero está vacío. NTFY_TOPIC y ANTHROPIC_API_KEY están en env pero sin uso. Pendiente: envío de resúmenes + integración LLM.

## DEUDA TÉCNICA

- Extraer navegación a app/components/Nav.tsx una vez implementadas todas las rutas principales.
- Centralizar constantes dispersas (PAGE_SIZE, CATEGORY_BADGE_CLASSES) en src/constants.ts.