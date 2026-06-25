-- ============================================================
-- Categories
-- ============================================================
CREATE TABLE categories (
  id        serial       PRIMARY KEY,
  name      text         NOT NULL UNIQUE,
  is_custom boolean      NOT NULL DEFAULT false
);

INSERT INTO categories (name) VALUES
  ('Comida a domicilio'),
  ('Restaurantes'),
  ('Supermercado'),
  ('Transporte'),
  ('Suscripciones'),
  ('Salud'),
  ('Entretenimiento'),
  ('Otros');

-- ============================================================
-- Transactions
-- ============================================================
CREATE TABLE transactions (
  id                serial           PRIMARY KEY,
  date              date             NOT NULL,
  merchant          text             NOT NULL,
  amount            numeric(10,2)    NOT NULL,
  currency          char(3)          NOT NULL DEFAULT 'MXN',
  card_last4        char(4),
  category_id       integer          REFERENCES categories(id),
  category_override boolean          NOT NULL DEFAULT false,
  email_id          text             NOT NULL UNIQUE,
  created_at        timestamptz      NOT NULL DEFAULT now()
);

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX idx_transactions_date        ON transactions(date);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON transactions
  FOR SELECT
  USING (auth.jwt() ->> 'email' = 'TU_EMAIL@gmail.com');

CREATE POLICY "owner_insert" ON transactions
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'email' = 'TU_EMAIL@gmail.com');

CREATE POLICY "owner_update" ON transactions
  FOR UPDATE
  USING (auth.jwt() ->> 'email' = 'TU_EMAIL@gmail.com');
