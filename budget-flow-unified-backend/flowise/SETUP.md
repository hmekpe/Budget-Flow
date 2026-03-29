# Flowise Setup For Budget Flow

This folder contains the exact pieces the Budget Flow assistant expects when Flowise is enabled in production.

The frontend still talks to:

- `POST /api/assistant/chat`

The feature backend then calls Flowise for live responses and falls back to rules mode if Flowise is unavailable.

## Backend Tool Endpoints

Budget Flow exposes these authenticated tool endpoints for Flowise:

- `GET /api/ai/summary`
- `GET /api/ai/categories`
- `GET /api/ai/transactions`
- `GET /api/ai/insights`

All of them require the same user JWT already issued by the app.

## Environment Values

Set these in the feature backend environment:

- `FLOWISE_ENABLED=true`
- `FLOWISE_BASE_URL=http://flowise:3000`
- `FLOWISE_CHATFLOW_ID=<your-chatflow-id>`
- `FLOWISE_API_KEY=<your-flowise-api-key>`
- `FLOWISE_TIMEOUT_MS=10000`
- `AI_TOOL_BASE_URL=http://feature-backend:5002`

`AI_TOOL_BASE_URL` must be reachable from the Flowise container. Inside the production compose network, keep it as `http://feature-backend:5002`.

## Production Order

1. Start PostgreSQL and Flowise first.
2. Sign in to the private Flowise admin UI.
3. Create the Budget Flow chatflow.
4. Create or select a Flowise API key.
5. Assign that API key to the chatflow.
6. Copy the chatflow id and API key into `.env.production`.
7. Set `FLOWISE_ENABLED=true`.
8. Restart `feature-backend`.

Until steps 4 to 7 are complete, keep `FLOWISE_ENABLED=false` so the app stays on the rules fallback instead of failing against an unfinished Flowise instance.

## Chatflow Layout

Create one chatflow called `budget-flow-assistant` with these pieces:

1. A chat model node
2. A memory node using the runtime `sessionId`
3. A prompt template node using `prompt-template.txt`
4. Four HTTP tool nodes using `tool-config.example.json`
5. An agent or tool-calling node that can call the tools

Recommended model choices:

- Ollama with a local model such as `llama3.1:8b`
- another hosted or self-hosted chat model supported by your Flowise install

## Runtime Variables You Must Create In Flowise

Create these variables in Flowise before testing the chatflow:

- `budgetFlowUserId`
- `budgetFlowJwt`
- `budgetFlowApiBaseUrl`
- `budgetFlowMonth`

The Budget Flow backend sends those values at runtime through `overrideConfig.vars`.

## Variable Syntax For HTTP Tools

Use Flowise variable syntax exactly like this in text fields:

- URL example: `{{$vars.budgetFlowApiBaseUrl}}/api/ai/summary?month={{$vars.budgetFlowMonth}}`
- Authorization header: `Bearer {{$vars.budgetFlowJwt}}`

The `tool-config.example.json` file already uses that format.

## Important Flowise Security Setting

If your Flowise version has a security section for chatflows or API overrides, allow runtime overrides for the variables Budget Flow sends:

- `budgetFlowUserId`
- `budgetFlowJwt`
- `budgetFlowApiBaseUrl`
- `budgetFlowMonth`

If override values are blocked, the tools will keep using blank values and the assistant will not be able to load user-scoped data.

## Prediction Contract

The feature backend calls Flowise through:

- `POST /api/v1/prediction/{chatflowId}`

At runtime the backend forwards:

- the user's current message
- a stable `sessionId` based on the authenticated user id
- the user's JWT as `budgetFlowJwt`
- the internal backend URL as `budgetFlowApiBaseUrl`
- the active month as `budgetFlowMonth`

That means Flowise should never connect directly to PostgreSQL. It should always go through the Budget Flow API tools.
