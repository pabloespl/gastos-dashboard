# Supabase — Gestión de migraciones

Este proyecto gestiona el schema de base de datos con archivos SQL versionados aplicados manualmente en el SQL Editor de Supabase.

## Estructura

```
supabase/
└── migrations/
    └── 20240101000000_initial_schema.sql   ← schema inicial
    └── 20240615120000_add_column_foo.sql   ← ejemplo de migración futura
```

## Flujo para cambios de schema

1. **Crear un nuevo archivo** en `supabase/migrations/` con el formato:
   ```
   YYYYMMDDHHMMSS_descripcion_corta.sql
   ```
   Ejemplo: `20260701140000_add_usd_amount_to_transactions.sql`

2. **Escribir el SQL** del cambio (solo el delta, no el schema completo).

3. **Aplicar manualmente** en el [SQL Editor de Supabase](https://supabase.com/dashboard) pegando el contenido del archivo.

4. **Commitear el archivo** al repositorio para mantener historial.

## Convenciones

- El nombre del archivo determina el orden de aplicación (cronológico).
- Cada migración debe ser idempotente cuando sea posible (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc.).
- No modificar migraciones ya aplicadas; siempre crear una nueva.
- El schema completo en cualquier momento equivale a aplicar todos los archivos en orden.
