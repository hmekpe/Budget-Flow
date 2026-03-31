# Budget Flow
## Application Documentation

Version: 1.0  
Date: March 31, 2026  
Prepared for: Product handoff, deployment support, stakeholder review, and operational continuity

---

## 1. Executive Summary

Budget Flow is a web-based personal finance application designed to help users manage everyday money decisions with clarity and confidence. The product combines account onboarding, budgeting, savings tracking, transaction history, reporting, currency conversion support, and an AI-powered assistant into a single web experience.

The current production deployment uses Render for hosting:

- Frontend: `https://bf-web.onrender.com`
- Auth API: `https://bf-auth-api.onrender.com`
- Feature API: `https://bf-feature-api.onrender.com`
- Database: Render PostgreSQL, shared privately between the backend services

The current AI provider is Groq. Flowise remains optional and is not required for the live deployment.

---

## 2. Product Overview

Budget Flow helps users:

- create an account using email/password or Google sign-in
- complete onboarding with country, language, and currency preferences
- create and manage a monthly budget
- group spending into categories
- add, review, and delete transaction history
- monitor savings goals, deposits, and withdrawals
- generate financial summaries and reports
- interact with an in-app assistant powered by live finance data and Groq
- switch display currency while preserving base stored values

The application is intended to feel simple for first-time users while still being structured enough for regular monthly budgeting.

---

## 3. Live Deployment Summary

### 3.1 Public Services

The active hosted services are:

- Frontend web app: `https://bf-web.onrender.com`
- Authentication backend: `https://bf-auth-api.onrender.com`
- Feature backend: `https://bf-feature-api.onrender.com`

### 3.2 Current Hosting Layout

The application is split into three hosted services:

1. A frontend service that serves the authentication screens and the main application UI.
2. An authentication backend that manages registration, login, password reset, session validation, and Google sign-in.
3. A feature backend that manages budgeting, savings, reporting, transactions, settings, notifications, and the AI assistant.

Both backend services connect to the same PostgreSQL database. The feature backend complements the auth backend schema rather than replacing it.

### 3.3 Environment Relationship

The frontend is configured with:

- `AUTH_API_BASE_URL=https://bf-auth-api.onrender.com/api/auth`
- `FEATURE_API_BASE_URL=https://bf-feature-api.onrender.com/api`

The backend services are configured to trust the frontend origin:

- `CLIENT_URL=https://bf-web.onrender.com`
- `ALLOWED_ORIGINS=https://bf-web.onrender.com`
- `FEATURE_FRONTEND_URL=https://bf-web.onrender.com` on the feature API

---

## 4. User-Facing Modules

### 4.1 Authentication

Users can:

- register with email and password
- log in with existing credentials
- sign in with Google
- request a password reset
- complete password reset through a secure tokenized link

### 4.2 Dashboard

The dashboard provides:

- total expenses
- total income
- current budget progress
- weekly summary visibility
- quick insight into financial status

### 4.3 Budgeting

The budgeting module supports:

- setting a monthly budget
- creating budget categories
- assigning spending limits
- logging spend against categories
- correcting spend values
- editing and deleting categories

### 4.4 Transactions and Activity

The app supports:

- adding transactions
- categorizing entries
- assigning dates and transaction type
- viewing transaction history
- filtering and reviewing activity
- deleting entries with confirmation

### 4.5 Savings

Users can:

- create savings goals
- define target amounts
- add money to a goal
- withdraw from a goal
- edit goal details
- delete goals with confirmation

### 4.6 Reports

The reporting view surfaces:

- income and expense totals
- category trends
- savings rate
- net position
- finance summaries for the current period

### 4.7 AI Assistant

The assistant is embedded in the application and can:

- answer questions about budgets
- summarize current spending
- explain savings progress
- identify top categories
- fall back to rules-based responses if live AI is unavailable

The current live AI path is Groq.

---

## 5. Architecture

### 5.1 Frontend Structure

The frontend is composed of:

- authentication pages under `Budget-Flow/`
- the main app under `Budget-Flow-feature-ohene/Budget-Flow-feature-ohene/`
- a runtime configuration layer injected at deploy time

This allows the same frontend codebase to work locally and in hosted environments.

### 5.2 Backend Structure

The platform uses two Bun + Express APIs:

- Auth backend in `Budget-Flow/backend`
- Feature backend in `budget-flow-unified-backend`

The auth backend owns:

- users
- password reset flow
- Google sign-in
- JWT issuance

The feature backend owns:

- dashboard summary
- transactions
- budgets and categories
- savings goals
- settings and preferences
- push-notification APIs
- assistant and finance insight endpoints

### 5.3 Data Layer

The application uses PostgreSQL as the system of record.

The database model supports:

- users
- password reset tokens
- transactions
- monthly budgets
- budget categories
- savings goals
- savings entries
- user settings and preferences
- notification settings and push subscription data

### 5.4 Deployment Pattern

The current production deployment is Render-based and separates:

- static/frontend delivery
- authentication service
- feature service
- managed PostgreSQL

This is different from the optional Docker Compose deployment pattern in the repository, which is still available for server-based hosting.

---

## 6. Key Technical Capabilities

### 6.1 Runtime Configuration

The frontend does not hardcode backend domains. Instead, it reads runtime values injected at startup, which makes the same build portable across environments.

### 6.2 Shared Authentication Model

The feature backend validates the same JWTs issued by the auth backend. Both services must use the same `JWT_SECRET`.

### 6.3 Currency-Aware Display

Budget Flow preserves stored monetary values in the user’s base/account currency while allowing display conversion for the UI.

### 6.4 AI Fallback

If Groq is unavailable, the app still returns useful finance responses using rule-based logic rather than failing silently.

### 6.5 Mobile and Desktop Support

The user interface has been adjusted to work on both desktop and mobile layouts, including responsive chat handling and safer action confirmations.

---

## 7. Third-Party Integrations

### 7.1 Groq

Groq powers the current live assistant mode using the OpenAI-compatible chat completions interface.

Primary use:

- finance-aware assistant responses
- data-backed conversation inside the app

### 7.2 ExchangeRate-API

Exchange rates are used to support display-currency conversion while preserving stored values in the user’s account currency.

Primary use:

- settings currency view
- converted value display
- exchange-rate attribution in the UI

### 7.3 Google Identity

Google is used for optional federated sign-in.

Primary use:

- easier account creation
- passwordless Google login path

### 7.4 Email Delivery

The auth backend supports password reset email sending, but the final delivery method depends on the deployed provider configuration.

Operational note:

- on free Render web services, outbound SMTP ports are restricted
- production-grade forgot-password email should therefore use either a paid auth instance or an HTTP email API provider

---

## 8. Authentication and Security

### 8.1 Session Model

Budget Flow uses JWT-based authentication.

### 8.2 Google Sign-In Requirements

Google sign-in requires:

- a valid Google OAuth web client
- the frontend origin added to Authorized JavaScript Origins
- the `GOOGLE_CLIENT_ID` environment variable on the auth backend

Current production frontend origin:

- `https://bf-web.onrender.com`

### 8.3 Password Reset

Password reset uses:

- time-limited reset tokens
- hashed token storage
- reset-link generation tied to the configured client URL

### 8.4 Destructive Action Protection

The app includes confirmation flows for irreversible actions such as:

- deleting transactions
- deleting categories
- deleting savings goals
- deleting the account

---

## 9. Current API Surface

### 9.1 Authentication API

Base URL:

- `https://bf-auth-api.onrender.com/api/auth`

Primary routes:

- `POST /register`
- `POST /login`
- `POST /forgot-password`
- `POST /reset-password`
- `GET /me`
- `GET /config`
- `POST /google`

### 9.2 Feature API

Base URL:

- `https://bf-feature-api.onrender.com/api`

Primary groups:

- `/meta`
- `/app`
- `/dashboard`
- `/transactions`
- `/budgets`
- `/savings`
- `/reports`
- `/settings`
- `/push`
- `/assistant`
- `/chat`
- `/ai`

### 9.3 Health Checks

Used for operational monitoring:

- `https://bf-auth-api.onrender.com/api/health`
- `https://bf-feature-api.onrender.com/api/health`

---

## 10. Current Render Configuration

### 10.1 Frontend Service

Service name:

- `bf-web`

Required env:

- `AUTH_API_BASE_URL=https://bf-auth-api.onrender.com/api/auth`
- `FEATURE_API_BASE_URL=https://bf-feature-api.onrender.com/api`

### 10.2 Auth Service

Service name:

- `bf-auth-api`

Core env:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `CLIENT_URL=https://bf-web.onrender.com`
- `ALLOWED_ORIGINS=https://bf-web.onrender.com`
- `TRUST_PROXY=true`
- `GOOGLE_CLIENT_ID`
- email delivery variables when enabled

### 10.3 Feature Service

Service name:

- `bf-feature-api`

Core env:

- `DATABASE_URL`
- `JWT_SECRET` matching the auth service
- `CLIENT_URL=https://bf-web.onrender.com`
- `FEATURE_FRONTEND_URL=https://bf-web.onrender.com`
- `ALLOWED_ORIGINS=https://bf-web.onrender.com`
- `TRUST_PROXY=true`
- Groq configuration values
- `FLOWISE_ENABLED=false` in the current production setup

### 10.4 Database

The PostgreSQL service is internal to Render and should only be connected through the internal database URL copied from the same account and region.

---

## 11. Operational Guidance

### 11.1 Recommended Health Checks

After any deployment:

1. confirm auth health endpoint
2. confirm feature health endpoint
3. open the frontend auth page
4. sign in with an existing account
5. verify dashboard bootstrap
6. test a chatbot prompt

### 11.2 Safe Configuration Rules

Always ensure:

- both backends use the same `JWT_SECRET`
- both backends point to the same Render Postgres instance
- the database and backends are in the same Render region
- the frontend env points to the exact live backend URLs
- Google origins match the live frontend domain

### 11.3 Updating the App

When code changes are pushed:

- redeploy the relevant Render service
- re-check frontend runtime config
- re-test login, dashboard, and assistant flows

---

## 12. Support and Troubleshooting

### 12.1 Common Issues

**Frontend loads but API calls fail**

Likely causes:

- incorrect frontend runtime env
- wrong backend URL
- CORS mismatch

**Backend crashes with `getaddrinfo ENOTFOUND`**

Likely causes:

- wrong `DATABASE_URL`
- database in a different Render account
- database in a different Render region
- copied external vs internal URL mismatch

**Google sign-in unavailable**

Likely causes:

- missing `GOOGLE_CLIENT_ID`
- missing frontend origin in Google Cloud
- app still in testing without the account added as a test user

**Forgot password email does not arrive**

Likely causes:

- missing email provider config
- SMTP blocked on free Render service
- invalid sender credentials

### 12.2 First Validation URLs

- `https://bf-web.onrender.com/pages/auth.html`
- `https://bf-web.onrender.com/runtime-config.js`
- `https://bf-auth-api.onrender.com/api/health`
- `https://bf-auth-api.onrender.com/api/auth/config`
- `https://bf-feature-api.onrender.com/api/health`

---

## 13. Product Strengths

Budget Flow’s current strengths include:

- clear separation of auth and feature services
- modern hosted architecture
- runtime-config-based frontend portability
- AI fallback support
- shared database model with logical service ownership
- multi-currency awareness
- improved mobile-friendliness
- safer destructive actions

---

## 14. Known Operational Notes

- Flowise is not required in the current production setup.
- Groq is the active assistant provider.
- Password reset delivery should be finalized with a production email provider strategy suited to the Render plan.
- The repository still includes server-based Docker deployment support for future migration if the team moves away from Render.

---

## 15. Reference Files

Repository files that support this documentation:

- `README.md`
- `HOSTING-HANDOVER.md`
- `HOSTING-BEGINNER-GUIDE.md`
- `PRODUCTION-DEPLOYMENT.md`
- `render.yaml`
- `Budget-Flow/backend/README.md`
- `budget-flow-unified-backend/README.md`

---

## 16. Conclusion

Budget Flow is now structured as a real multi-service web product with a working hosted frontend, dedicated auth and feature APIs, managed data storage, and a live AI integration path. The current Render deployment is suitable for demonstration, review, and iterative product development, while the repository remains flexible enough to support future migration to another hosting model if required.

This document is intended to make onboarding, review, troubleshooting, and stakeholder communication easier by giving one clear source of truth for the app’s purpose, architecture, deployment, and operating model.
