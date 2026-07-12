ALTER TABLE transactions ADD COLUMN IF NOT EXISTS excluded boolean NOT NULL DEFAULT false;
