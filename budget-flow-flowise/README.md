# Local Flowise Service

This folder runs a local Flowise instance for Budget Flow using Bun.

## Start

```bash
bun run start
```

The service is expected at:

- `http://localhost:3001`

## First-Time Setup

1. Copy `.env.example` to `.env`
2. Start Flowise with `bun run start`
3. Sign in with the credentials from `.env`
4. Create one chatflow for Budget Flow
5. Create a Flowise API key
6. Put that API key into `budget-flow-unified-backend/.env` as `FLOWISE_API_KEY`
7. Put the created chatflow id into `budget-flow-unified-backend/.env` as `FLOWISE_CHATFLOW_ID`
8. Set `FLOWISE_ENABLED=true` in `budget-flow-unified-backend/.env`

For the production container stack, use:

- `PRODUCTION-DEPLOYMENT.md`
- `budget-flow-unified-backend/flowise/SETUP.md`

## Budget Flow Files To Use

Use these files from `budget-flow-unified-backend/flowise` when building the chatflow:

- `SETUP.md`
- `prompt-template.txt`
- `tool-config.example.json`
