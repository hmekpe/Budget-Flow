-- Budget Flow authentication schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT,
  provider VARCHAR(30) NOT NULL DEFAULT 'local',
  provider_id TEXT,
  is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Finance domain tables

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- 'income' or 'expense'
  category VARCHAR(80) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  payment_method VARCHAR(40) NOT NULL, -- cash, momo, card (simulated)
  note TEXT,
  occurred_on DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_budgets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, year, month)
);

CREATE TABLE IF NOT EXISTS savings_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  target_amount NUMERIC(12, 2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_used ON password_reset_tokens (expires_at, used);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id, occurred_on);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (user_id, category);
CREATE INDEX IF NOT EXISTS idx_monthly_budgets_user_month ON monthly_budgets (user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user ON savings_goals (user_id);

