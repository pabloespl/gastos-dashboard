-- ============================================================
-- Categories
-- ============================================================
CREATE TABLE categories (
  id          serial    PRIMARY KEY,
  name        text      NOT NULL UNIQUE,
  is_custom   boolean   NOT NULL DEFAULT false
);

-- ============================================================
-- Transactions
-- ============================================================
CREATE TABLE transactions (
  message_id        text        PRIMARY KEY,
  datetime          timestamptz NOT NULL,
  merchant          text        NOT NULL,
  amount            numeric     NOT NULL,
  currency          char(3)     NOT NULL DEFAULT 'CLP',
  card_last4        char(4),
  category_id       integer     REFERENCES categories(id),
  category_override boolean     DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

-- ============================================================
-- Índices
-- ============================================================
CREATE INDEX transactions_datetime_idx     ON transactions(datetime);
CREATE INDEX transactions_category_id_idx  ON transactions(category_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "solo propietario" ON transactions
  FOR ALL
  USING (true);
