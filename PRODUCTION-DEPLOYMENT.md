# Budget Flow Production Deployment

This project now includes a production-ready container stack that serves the auth frontend, the feature frontend, both Bun backends, and PostgreSQL behind one public web origin. AI can be provided by Groq immediately or by Flowise when you are ready to operate your own chatflow.

## What The Production Stack Does

- serves the web app from one public URL
- reverse-proxies `/api/auth/*` to the auth backend
- reverse-proxies `/api/*` to the feature backend
- can keep Flowise off the public internet by binding its admin UI to `127.0.0.1`
- lets the frontend use production-safe same-origin API paths instead of hardcoded localhost URLs

## Files Added For Deployment

- `docker-compose.production.yml`
- `production.env.example`
- `deployment/frontend/Dockerfile`
- `deployment/frontend/default.conf`
- `Budget-Flow/backend/Dockerfile`
- `budget-flow-unified-backend/Dockerfile`

## 1. Prepare Environment Values

Copy the example file and fill in real values:

```powershell
Copy-Item production.env.example .env.production
```

Important values:

- `PUBLIC_WEB_URL`
- `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `GROQ_ENABLED` and `GROQ_API_KEY` if Groq should power the chatbot
- `GOOGLE_CLIENT_ID` if Google sign-in should stay enabled
- `SMTP_*` and `MAIL_FROM` for password reset emails
- `FLOWISE_USERNAME`
- `FLOWISE_PASSWORD`
- `FLOWISE_POSTGRES_PASSWORD`
- `FLOWISE_SECRETKEY_OVERWRITE`
- `FLOWISE_JWT_AUTH_TOKEN_SECRET`
- `FLOWISE_JWT_REFRESH_TOKEN_SECRET`
- `FLOWISE_EXPRESS_SESSION_SECRET`
- `FLOWISE_TOKEN_HASH_SECRET`

Choose one AI path before deployment:

- Groq path: set `GROQ_ENABLED=true`, fill `GROQ_API_KEY`, and keep `FLOWISE_ENABLED=false`
- Flowise path: keep `FLOWISE_ENABLED=false` until the chatflow has been created and both `FLOWISE_API_KEY` and `FLOWISE_CHATFLOW_ID` are filled in, then switch `FLOWISE_ENABLED=true`

## 2. Build The Stack

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build
```

## 3. Initialize The Database

Run the auth schema first, then the feature schema:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml run --rm auth-backend bun run db:init
docker compose --env-file .env.production -f docker-compose.production.yml run --rm feature-backend bun run db:init
```

## 4. Start Core Services First

For the fastest production launch, start with the Groq path and keep Flowise disabled.

Groq-first startup:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d postgres auth-backend feature-backend frontend
```

Optional Flowise startup:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d postgres flowise
```

If you are not using Flowise yet, you can skip the next section entirely.

## 5. Configure Flowise

The compose stack keeps Flowise private by publishing it on loopback only:

- `http://127.0.0.1:${FLOWISE_ADMIN_PORT}` on the server host

Production setup flow:

1. SSH into the host or tunnel the local-only Flowise port.
2. Sign in with `FLOWISE_USERNAME` and `FLOWISE_PASSWORD`.
3. Create the new admin account if Flowise asks you to claim ownership with the bootstrap credentials first.
4. Create these Flowise variables before testing the flow:
   - `budgetFlowUserId`
   - `budgetFlowJwt`
   - `budgetFlowApiBaseUrl`
   - `budgetFlowMonth`
5. Build one chatflow called `budget-flow-assistant` using:
   - the prompt in `budget-flow-unified-backend/flowise/prompt-template.txt`
   - the HTTP tool definitions in `budget-flow-unified-backend/flowise/tool-config.example.json`
6. Make sure the tool URLs use Flowise variable syntax like `{{$vars.budgetFlowApiBaseUrl}}`.
7. Create or choose a Flowise API key and assign it to that chatflow.
8. Copy the API key into `.env.production` as `FLOWISE_API_KEY`.
9. Copy the chatflow id into `.env.production` as `FLOWISE_CHATFLOW_ID`.
10. Switch `FLOWISE_ENABLED=true`.
11. Start the full stack:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

Public app URL:

- `http://localhost:8080/pages/auth.html` for a local production-style smoke test
- your real `PUBLIC_WEB_URL` in hosting

The feature backend is already wired to pass:

- the authenticated user session id
- the user JWT
- the internal AI tool base URL
- the active month context

to Flowise so the chatbot can use the secured `/api/ai/*` tool endpoints.

## 6. Operational Notes

- Keep `PUBLIC_WEB_URL` aligned with your real HTTPS domain so reset emails land on the correct frontend URL.
- Set the same `JWT_SECRET` on both backends.
- Keep `AI_TOOL_BASE_URL=http://feature-backend:5002` when Flowise runs inside this compose network.
- Flowise now uses its own PostgreSQL database inside the same stack instead of only the local `.flowise` sqlite state.
- Keep the `flowise-data` volume because Flowise still stores secret-key material, logs, and local blob storage there.
- If you already created the postgres volume before this change, create the Flowise database/user manually or recreate the postgres volume so the init script can run.
- This compose file is a solid single-instance production baseline. If you later expect heavier AI traffic, move Flowise to its queue-mode deployment pattern instead of only scaling this one container.
- If you terminate TLS in a cloud load balancer or reverse proxy, keep `TRUST_PROXY=true` as already set in the compose file.
- The frontend no longer depends on hardcoded localhost API URLs, so the web app can be distributed behind any same-origin reverse proxy.

## 7. Local Development Still Works

The existing local workflow is still valid:

- auth backend on `5000`
- feature backend on `5002`
- static workflow server on `5500`

The frontend now auto-detects that localhost workflow and only switches to same-origin API paths when deployed behind the production proxy.
