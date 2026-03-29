-- Budget Flow feature backend schema additions
-- This script complements the base auth schema in Budget-Flow/backend/sql/init.sql
-- and stays compatible with older finance tables that may already exist.

ALTER TABLE savings_goals
  ADD COLUMN IF NOT EXISTS emoji TEXT NOT NULL DEFAULT '🏖️';

ALTER TABLE savings_goals
  ADD COLUMN IF NOT EXISTS color TEXT;

CREATE TABLE IF NOT EXISTS budget_categories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '📌',
  color TEXT,
  monthly_limit NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (monthly_limit >= 0),
  spent_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (spent_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE budget_categories
  ADD COLUMN IF NOT EXISTS spent_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
  base_currency VARCHAR(10) NOT NULL DEFAULT 'GHS',
  country_code VARCHAR(10),
  language VARCHAR(10) NOT NULL DEFAULT 'en',
  theme VARCHAR(10) NOT NULL DEFAULT 'dark',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  budget_reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_time TIME,
  push_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  budget_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS base_currency VARCHAR(10);

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(10);

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN;

UPDATE user_settings
SET base_currency = COALESCE(NULLIF(base_currency, ''), currency, 'GHS')
WHERE base_currency IS NULL OR base_currency = '';

UPDATE user_settings
SET onboarding_completed = TRUE
WHERE onboarding_completed IS NULL;

ALTER TABLE user_settings
  ALTER COLUMN base_currency SET DEFAULT 'GHS';

ALTER TABLE user_settings
  ALTER COLUMN base_currency SET NOT NULL;

ALTER TABLE user_settings
  ALTER COLUMN onboarding_completed SET DEFAULT FALSE;

ALTER TABLE user_settings
  ALTER COLUMN onboarding_completed SET NOT NULL;

CREATE TABLE IF NOT EXISTS savings_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id INTEGER NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_categories_name
  ON budget_categories (user_id, name);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id
  ON user_settings (user_id);

CREATE INDEX IF NOT EXISTS idx_savings_entries_goal_id
  ON savings_entries (goal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_savings_entries_user_id
  ON savings_entries (user_id, created_at DESC);
