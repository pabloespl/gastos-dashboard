-- ============================================================
-- Seguridad: restringir RLS al propietario por email
-- ------------------------------------------------------------
-- La policy anterior usaba USING (true), lo que dejaba pasar a
-- CUALQUIER usuario autenticado (y a cualquiera con la anon key).
-- Aquí restringimos el acceso al email del propietario, leído del
-- JWT de Supabase Auth (auth.jwt() ->> 'email').
--
-- IMPORTANTE: reemplazar 'REEMPLAZAR_CON_MI_EMAIL' por tu email real
-- (el mismo que NEXT_PUBLIC_ALLOWED_EMAIL) en TODAS las cláusulas
-- antes de aplicar esta migración.
-- ============================================================

-- ------------------------------------------------------------
-- transactions
-- ------------------------------------------------------------
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solo propietario" ON transactions;

CREATE POLICY "solo propietario" ON transactions
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'pablo.ezp@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'pablo.ezp@gmail.com');

-- ------------------------------------------------------------
-- categories
-- ------------------------------------------------------------
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solo propietario" ON categories;

CREATE POLICY "solo propietario" ON categories
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'pablo.ezp@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'pablo.ezp@gmail.com');
