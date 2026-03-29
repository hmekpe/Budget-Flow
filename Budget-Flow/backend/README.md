# budget-flow-auth-backend

This is a small authentication backend for the Budget Flow project.  
It exposes REST APIs for registration, login, password reset, and Google sign-in.

## Setup

From the `backend` folder:

```bash
bun install
```

Create a `.env` file by copying `.env.example` and filling:

- `DATABASE_URL` – Postgres connection string  
- `JWT_SECRET` – any long random string  
- `CLIENT_URL` – origin where the frontend is served (for reset links)  
- Optional SMTP values if you want real password-reset emails  
- Optional `GOOGLE_CLIENT_ID` if you want Google sign-in enabled

## Database

Run the schema migration once to create tables:

```bash
bun run db:init
```

## Running the server

For development with file watching:

```bash
bun run dev
```

The server will start on `http://localhost:5000`.

## Auth endpoints

All endpoints are prefixed with `/api/auth`:

- `POST /register` – create a new local user  
- `POST /login` – login with email & password  
- `POST /forgot-password` – request a password reset email  
- `POST /reset-password` – complete password reset using a token  
- `GET /me` – returns the current authenticated user (requires `Authorization: Bearer <token>`)  
- `POST /google` – login with Google ID token (requires `GOOGLE_CLIENT_ID` to be configured)

This project was created using `bun init` in bun v1.2.19. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
