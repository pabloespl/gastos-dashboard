-- ============================================================
-- Documenta el schema de `transfers`, ya aplicado directamente
-- en producción (fuera del flujo normal de migraciones). Este
-- archivo es un backfill idempotente: no cambia nada en la BD,
-- solo deja registro en el historial versionado.
-- ============================================================

CREATE TABLE IF NOT EXISTS transfers (
  message_id        text        PRIMARY KEY,
  datetime          timestamptz NOT NULL,
  recipient_name    text,
  recipient_rut     text,
  recipient_bank    text,
  recipient_account text,
  amount            numeric     NOT NULL,
  memo              text,
  source_account    text,
  transaction_id    text,
  inserted_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transfers_datetime ON transfers(datetime DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_transfers_transaction_id ON transfers(transaction_id) WHERE transaction_id IS NOT NULL;

ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solo propietario" ON transfers;
CREATE POLICY "solo propietario" ON transfers
  FOR ALL
  USING (auth.jwt() ->> 'email' = 'pablo.ezp@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'pablo.ezp@gmail.com');
