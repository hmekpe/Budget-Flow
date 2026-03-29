# Budget Flow Feature Backend

This folder contains the missing backend for the dashboard and finance features in the existing frontends.

It is intentionally built to complement the auth backend already living in `Budget-Flow/backend`:

- same stack: `Bun + Express + PostgreSQL`
- same auth model: verifies the same JWTs using the same `JWT_SECRET`
- no duplicate auth routes
- no duplicate base auth tables

## What This Service Covers

- dashboard summary/bootstrap data
- transactions and activity history
- monthly budgets and budget categories
- savings goals, deposits, and withdrawals
- reports and analytics
- profile/settings/preferences/notifications
- a Flowise-ready Budget AI endpoint for the in-app assistant

## What It Does Not Duplicate

- user registration/login/password reset
- Google auth flow
- the `users`, `password_reset_tokens`, `transactions`, `monthly_budgets`, and `savings_goals` base schema already defined in `Budget-Flow/backend/sql/init.sql`

This service expects those auth/base tables to exist already, then adds only the extra feature tables and columns it needs.

## Setup

1. Install dependencies:

```bash
bun install
```

2. Copy `.env.example` to `.env`.

3. Make sure the auth backend schema has already been initialized from `Budget-Flow/backend/sql/init.sql`.

4. Initialize the feature tables in this folder:

```bash
bun run db:init
```

5. Start the server:

```bash
bun run dev
```

The feature backend runs on `http://localhost:5002` by default.

## Flowise AI Integration

This backend now supports a production-style Flowise integration without changing the frontend chat UI.

What is already implemented in this folder:

- `POST /api/assistant/chat` for the unchanged frontend
- `POST /api/chat` as a direct backend AI alias
- `GET /api/ai/summary`
- `GET /api/ai/categories`
- `GET /api/ai/transactions`
- `GET /api/ai/insights`
- JWT validation on every AI endpoint
- user-scoped data filtering
- in-memory rate limiting for chat requests
- Flowise timeout handling with a safe backend fallback

Flowise setup assets are included in:

- `flowise/SETUP.md`
- `flowise/prompt-template.txt`
- `flowise/tool-config.example.json`

Add these environment variables to enable Groq quickly:

```bash
ASSISTANT_MODE=hybrid
GROQ_ENABLED=true
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-20b
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_TIMEOUT_MS=10000
AI_CHAT_RATE_LIMIT_WINDOW_MS=60000
AI_CHAT_RATE_LIMIT_MAX=15
AI_CACHE_TTL_MS=30000
```

If you prefer Flowise instead, use:

```bash
ASSISTANT_MODE=hybrid
FLOWISE_ENABLED=true
FLOWISE_BASE_URL=http://localhost:3001
FLOWISE_CHATFLOW_ID=your-chatflow-id
FLOWISE_API_KEY=your-flowise-api-key
FLOWISE_TIMEOUT_MS=6000
AI_TOOL_BASE_URL=http://localhost:5002
AI_CHAT_RATE_LIMIT_WINDOW_MS=60000
AI_CHAT_RATE_LIMIT_MAX=15
AI_CACHE_TTL_MS=30000
```

For the frontends, use the root Bun static server:

```bash
bun serve-frontends.js
```

The stable frontend workflow is:

- auth page: `http://localhost:5500/pages/auth.html`
- feature app: `http://localhost:5500/app/index.html#dashboard`

Port `5501` is kept only as a compatibility feature-only entry.

## Main Endpoints

All feature endpoints are protected with Bearer auth unless noted otherwise.

- `GET /api/health`
- `GET /api/meta`
- `GET /api/app/bootstrap`
- `GET /api/dashboard/summary`
- `GET /api/transactions`
- `POST /api/transactions`
- `DELETE /api/transactions/:id`
- `GET /api/budgets/current`
- `PUT /api/budgets/current`
- `GET /api/budgets/categories`
- `POST /api/budgets/categories`
- `PUT /api/budgets/categories/:id`
- `DELETE /api/budgets/categories/:id`
- `POST /api/budgets/categories/:id/log-spend`
- `POST /api/budgets/categories/:id/correct-spend`
- `GET /api/savings/summary`
- `GET /api/savings/goals`
- `POST /api/savings/goals`
- `PUT /api/savings/goals/:id`
- `DELETE /api/savings/goals/:id`
- `POST /api/savings/goals/:id/deposit`
- `POST /api/savings/goals/:id/withdraw`
- `GET /api/reports/current`
- `GET /api/settings/profile`
- `PUT /api/settings/profile`
- `GET /api/settings/preferences`
- `PUT /api/settings/preferences`
- `GET /api/settings/notifications`
- `PUT /api/settings/notifications`
- `DELETE /api/settings/account`
- `POST /api/assistant/chat`
- `POST /api/chat`
- `GET /api/ai/summary`
- `GET /api/ai/categories`
- `GET /api/ai/transactions`
- `GET /api/ai/insights`

## Conflict Notes

- This folder does not redefine the auth routes from the existing backend.
- This folder reuses existing `budget_categories` and `savings_entries` tables when they already exist in the shared database.
- This folder adds only the missing feature columns and tables needed for settings and the remaining dashboard workflows.
- This folder uses port `5002` so it does not clash with the auth backend on `5000`.
- The older `Budget-Flow-feature-ohene/Budget-Flow-feature-ohene/server.py` already uses `5001`, so `5002` avoids a legacy port collision.
- Flowise never talks to PostgreSQL directly in this setup. It only reaches user-scoped finance data through the protected `/api/ai/*` endpoints.
