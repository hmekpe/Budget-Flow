# Project Documentation
## Budget Flow Web Application

Version: 1.1  
Date: March 31, 2026

---

## 1. Project Overview

Budget Flow is a financial management web application built to help users manage everyday money more clearly.

The application allows users to:

- track income and expenses
- manage personal budgets
- monitor savings goals
- view financial data in a simple dashboard
- get quick insights from an AI assistant

The main goal of the project is to simplify personal finance management and make it easier for users to understand their spending habits and make better decisions.

Similar systems are usually used to:

- monitor transactions
- create and maintain budgets
- analyze financial behavior over time

---

## 2. Objectives

The core objectives of Budget Flow are:

- provide a simple platform for tracking finances
- help users make better financial decisions
- automate calculations and budgeting logic
- offer visual insights through the dashboard and reports

---

## 3. System Architecture

Budget Flow uses a multi-layer architecture:

```text
Frontend (UI)
   ↓
Backend APIs (Auth + Feature services)
   ↓
Database (PostgreSQL)
```

### Frontend

The frontend is built with:

- HTML
- CSS
- JavaScript

It is responsible for:

- rendering the user interface
- handling user interaction
- navigation between screens

### Backend

The backend is split into two services.

#### Auth Backend

This service handles:

- user registration
- login
- password reset
- Google sign-in
- JWT authentication

#### Feature Backend

This service handles:

- budget logic
- transactions
- savings
- reports
- settings
- AI assistant features

### Database

The application uses PostgreSQL.

It stores data such as:

- users
- transactions
- budgets
- savings information
- settings and preferences

---

## 4. Project Structure

The project is organized into these main parts:

```text
Budget-Flow/
│
├── Budget-Flow/backend/              # Auth service
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   └── config/
│
├── budget-flow-unified-backend/      # Feature service
│
├── Budget-Flow/                      # Auth frontend pages
├── Budget-Flow-feature-ohene/
│   └── Budget-Flow-feature-ohene/    # Main app UI
├── deployment/                       # Deployment files
├── render.yaml                       # Render blueprint
└── start-workflow.cmd                # Local workflow starter
```

---

## 5. Installation and Setup

### Requirements

To run the project locally, you need:

- Bun
- PostgreSQL
- Git

### Steps

#### 1. Clone the repository

```bash
git clone https://github.com/hmekpe/Budget-Flow.git
cd Budget-Flow
```

#### 2. Install dependencies

Install dependencies inside the backend folders with Bun.

Auth backend:

```bash
cd Budget-Flow/backend
bun install
```

Feature backend:

```bash
cd ../../budget-flow-unified-backend
bun install
```

#### 3. Set up environment variables

Create a `.env` file for the auth backend and feature backend.

Example auth backend values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/budget_flow
JWT_SECRET=your_secret
CLIENT_URL=http://localhost:5500
```

Example feature backend values:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/budget_flow
JWT_SECRET=your_secret
CLIENT_URL=http://localhost:5500
FEATURE_FRONTEND_URL=http://localhost:5500
```

Important:

- both backends must use the same `JWT_SECRET`
- both backends should point to the same PostgreSQL database

#### 4. Run the project

You can use the local workflow starter:

```powershell
.\start-workflow.cmd
```

This local workflow is designed to start the app stack for development.

---

## 6. Authentication System

Budget Flow uses JWT (JSON Web Tokens) for authentication.

### Authentication Flow

1. The user registers or logs in.
2. The server generates a JWT.
3. The token is stored on the client.
4. The token is sent with protected API requests.

The auth service also supports Google sign-in and password reset.

---

## 7. Core Functionalities

### Budget Management

Users can:

- create budgets
- assign categories
- track spending against those categories

### Transactions

Users can:

- add income and expenses
- organize transactions by category
- view transaction history
- remove entries when needed

### Dashboard

The dashboard provides:

- a financial overview
- budget progress
- income and expense summaries
- quick visual understanding of spending behavior

### Advanced Features

The app also includes:

- notifications and reminders
- an AI financial assistant
- multi-currency display support

---

## 8. Database Design

The database is built around a few core entities.

### Example Tables

#### Users

- `id`
- `email`
- `password`
- `created_at`

#### Transactions

- `id`
- `user_id`
- `amount`
- `category`
- `date`
- `type`

Other tables in the system support:

- budgets
- budget categories
- savings goals
- settings
- password reset tokens

---

## 9. API Overview

### Auth APIs

The authentication service exposes routes such as:

- `POST /register`
- `POST /login`
- `POST /forgot-password`
- `POST /reset-password`
- `POST /google`
- `GET /me`

### Feature APIs

The feature service exposes routes such as:

- `GET /transactions`
- `POST /transactions`
- `DELETE /transactions/:id`
- `GET /budgets/current`
- `GET /budgets/categories`
- `GET /dashboard/summary`
- `GET /reports/current`
- `GET /savings/summary`

### Third-Party APIs

#### Groq API

Groq is used to power the AI chatbot.

- Endpoint: `POST https://api.groq.com/openai/v1/chat/completions`
- Authentication: `GROQ_API_KEY`
- Current model: `openai/gpt-oss-20b`

Implemented in:

- `budget-flow-unified-backend/src/services/assistant.service.js`
- `budget-flow-unified-backend/src/services/assistant-config.service.js`

Official docs:

- https://console.groq.com/docs/openai
- https://console.groq.com/docs/api-reference

#### ExchangeRate-API

ExchangeRate-API is used for currency conversion in the app.

- Endpoint: `https://open.er-api.com/v6/latest`
- No API key required
- Updates once per day
- Rate-limited on the free plan
- Requires attribution

Implemented in:

- `budget-flow-unified-backend/src/services/exchange-rates.service.js`

Official docs:

- https://www.exchangerate-api.com/docs/free

---

## 10. Deployment

Budget Flow is currently deployed on Render.

### Current Live Services

- Frontend: `https://bf-web.onrender.com`
- Auth API: `https://bf-auth-api.onrender.com`
- Feature API: `https://bf-feature-api.onrender.com`

### Render Deployment Notes

The current production setup uses:

- one frontend service
- one auth backend service
- one feature backend service
- one shared PostgreSQL database

To run the hosted app correctly:

- the frontend must point to the auth and feature API URLs
- both backends must use the same `JWT_SECRET`
- both backends must connect to the same PostgreSQL database
- the database and backend services must be in the same Render region

---

## 11. How to Run the App Successfully

If someone wants to run the app themselves, these are the most important things to remember:

1. Install Bun, PostgreSQL, and Git.
2. Clone the repository.
3. Install dependencies in both backend folders.
4. Create valid `.env` files for both services.
5. Use the same database and JWT secret across the backends.
6. Start the local workflow or run the services individually.

For hosted deployment:

1. Create the database first.
2. Deploy the auth backend.
3. Deploy the feature backend.
4. Deploy the frontend.
5. Connect the frontend to the live backend URLs.

---

## 12. Conclusion

Budget Flow is a complete web application for personal finance management. It combines a user-friendly frontend, a split backend architecture, PostgreSQL data storage, and third-party integrations like Groq and ExchangeRate-API to deliver a modern budgeting experience.

The project is designed to be practical, scalable, and easy to maintain. With the correct environment setup, it can be run locally for development or deployed to Render for production use.
