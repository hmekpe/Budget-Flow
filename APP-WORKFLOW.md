# Budget Flow Workflow

This project is now wired as one flow across the three main folders:

## 1. Auth Frontend

Path: `Budget-Flow/pages/auth.html`

Purpose:
- sign up
- log in
- request password reset
- receive JWT from the auth backend
- redirect into the main app after authentication

Uses:
- auth backend at `http://localhost:5000`

## 2. Main Feature Frontend

Path: `Budget-Flow-feature-ohene/Budget-Flow-feature-ohene/index.html`

Purpose:
- dashboard
- budgets
- add transaction
- activity
- reports
- savings
- settings
- in-app assistant

Uses:
- auth token from the auth frontend
- feature backend at `http://localhost:5002`

## 3. Auth Backend

Path: `Budget-Flow/backend`

Purpose:
- register
- login
- forgot password
- reset password
- Google login
- token issuance

Port:
- `5000`

## 4. Feature Backend

Path: `budget-flow-unified-backend`

Purpose:
- dashboard bootstrap
- transactions
- budgets and budget categories
- savings goals
- reports
- settings/preferences/notifications
- assistant chat endpoint
- Flowise AI bridge endpoints for the assistant

Port:
- `5002`

## Run Order

1. From the root folder, you can now start everything with one command:

```bash
.\start-workflow.cmd
```

2. If you prefer the manual flow, start the auth backend from `Budget-Flow/backend`
3. Start the feature backend from `budget-flow-unified-backend`
4. From the root folder, run:

```bash
bun serve-frontends.js
```

5. Open `http://localhost:5500/pages/auth.html`
6. Log in or sign up
7. You will be redirected into `http://localhost:5500/app/index.html#dashboard`

## Optional Groq Assistant

If you want the assistant to use a hosted model fast, point the feature backend to Groq with these variables in `budget-flow-unified-backend/.env`:

- `ASSISTANT_MODE=hybrid`
- `GROQ_ENABLED=true`
- `GROQ_API_KEY=<groq-api-key>`
- `GROQ_MODEL=openai/gpt-oss-20b`
- `GROQ_BASE_URL=https://api.groq.com/openai/v1`

The backend will still fall back to the built-in rules assistant if Groq is unavailable.

## Optional Flowise Service

If you want the assistant to use live LLM responses instead of the backend fallback, run a private Flowise instance and point the feature backend to it with these variables in `budget-flow-unified-backend/.env`:

- `FLOWISE_ENABLED=true`
- `FLOWISE_BASE_URL=http://localhost:3001`
- `FLOWISE_CHATFLOW_ID=<chatflow-id>`
- `FLOWISE_API_KEY=<flowise-api-key>`
- `AI_TOOL_BASE_URL=http://localhost:5002`

Flowise configuration assets live in `budget-flow-unified-backend/flowise`.

## Important Notes

- The auth frontend and feature frontend now share the same frontend origin on `5500`, which keeps the JWT available in one `localStorage` scope and prevents redirect loops between ports.
- The auth frontend now redirects to the real app entry point instead of a missing `dashboard.html`.
- The feature frontend now reads the shared JWT token and calls the real feature backend.
- `Budget-Flow-feature-ohene/Budget-Flow-feature-ohene/settings-screen.html` is now a compatibility redirect to `index.html#settings`.
- `Budget-Flow-feature-ohene/Budget-Flow-feature-ohene/server.py` is a legacy mock-era file and should not be used for the new workflow.
- The feature backend uses `5002` to avoid clashing with the legacy `server.py` that already used `5001`.
- Port `5501` is kept only as a compatibility entry for the feature frontend. The stable workflow should start from `5500`.

## Production Deployment

Production-ready deployment assets now exist at the project root:

- `docker-compose.production.yml`
- `production.env.example`
- `PRODUCTION-DEPLOYMENT.md`

That stack serves the web app from one public origin and reverse-proxies the auth and feature APIs so the frontend can run in production without laptop-only `localhost` assumptions.
