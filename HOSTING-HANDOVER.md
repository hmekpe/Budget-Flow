# Budget Flow Hosting Handover

This file is for handing the project to the person who will host it.

## What To Push To GitHub

Push the application source and deployment files, including:

- `docker-compose.production.yml`
- `production.env.example`
- `PRODUCTION-DEPLOYMENT.md`
- `deployment/frontend/Dockerfile`
- `deployment/frontend/default.conf`
- `Budget-Flow/backend/Dockerfile`
- `budget-flow-unified-backend/Dockerfile`
- the frontend and backend source code

## What Must Not Be Pushed

Do not push any real secret files:

- `.env.production`
- `budget-flow-unified-backend/.env`
- `Budget-Flow/backend/.env`

These are already ignored by `.gitignore`, but confirm before pushing.

## What To Send Privately To The Hosting Person

Send these outside GitHub, for example by WhatsApp, Signal, email, or a password manager:

- real production domain name
- final `PUBLIC_WEB_URL`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `GROQ_API_KEY`
- `GOOGLE_CLIENT_ID`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

If Flowise will stay disabled, they do not need Flowise API values now.

## Production Choices For This App

Current recommended production path:

- `ASSISTANT_MODE=hybrid`
- `GROQ_ENABLED=true`
- `FLOWISE_ENABLED=false`

That means hosting should use Groq for the chatbot and not depend on Flowise yet.

## What The Hosting Person Needs To Do

1. Clone the GitHub repo onto the server.
2. Copy `production.env.example` to `.env.production`.
3. Fill `.env.production` with the real private values you send separately.
4. Set:
   - `PUBLIC_WEB_URL=https://your-real-domain`
   - `GROQ_ENABLED=true`
   - `GROQ_API_KEY=...`
   - `FLOWISE_ENABLED=false`
5. Build and start the stack:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml run --rm auth-backend bun run db:init
docker compose --env-file .env.production -f docker-compose.production.yml run --rm feature-backend bun run db:init
docker compose --env-file .env.production -f docker-compose.production.yml up -d postgres auth-backend feature-backend frontend
```

## External Accounts That Must Match Production

### Google Sign-In

The Google OAuth web client must include the real frontend origin in Authorized JavaScript origins, for example:

- `https://your-real-domain`
- keep `http://localhost:5500` for local testing

### Groq

Use a fresh Groq API key for production. If a key was pasted in chat or shared insecurely before, rotate it first.

### Email

If password reset emails should work, provide a real SMTP app password in `SMTP_PASS`.

## Handover Checklist

Before you hand off hosting:

- push code to GitHub
- confirm no real `.env` files were committed
- send the real env values privately
- send the final domain name
- tell the hosting person whether email reset must be enabled now
- tell the hosting person Groq is the active AI provider

