ALTER TABLE transfers ADD COLUMN IF NOT EXISTS category_id integer REFERENCES categories(id);
CREATE INDEX IF NOT EXISTS idx_transfers_category_id ON transfers(category_id);
