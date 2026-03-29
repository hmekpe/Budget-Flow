# Budget-Flow
Budget Flow is a web-based personal finance management application that helps users track expenses, manage budgets, monitor savings goals, and visualize spending patterns through an interactive dashboard and smart assistant.

## Integrated Entry Point

Use `index.html` as the main app entry point.

- Auth frontend lives in `Budget-Flow/pages/auth.html`
- Main feature frontend lives in `Budget-Flow-feature-ohene/Budget-Flow-feature-ohene/index.html`
- Auth backend lives in `Budget-Flow/backend` on `http://localhost:5000`
- Feature backend lives in `budget-flow-unified-backend` on `http://localhost:5002`

## Notes

- From the repo root, run `bun serve-frontends.js` and use the shared workflow origin:
  - auth page: `http://localhost:5500/pages/auth.html`
  - feature app: `http://localhost:5500/app/index.html#dashboard`
- `5501` is kept only as a compatibility feature-only port, but the stable auth-to-dashboard flow now stays on `5500` so the JWT remains in one browser origin.
- `settings-screen.html` now redirects into `index.html#settings` so there is only one active settings flow.
- `server.py` is a legacy file from the old mock setup and is not part of the new Bun/Postgres workflow.
