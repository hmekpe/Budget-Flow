# Budget Flow

Budget Flow is a web-based personal finance management application that helps users track expenses, manage budgets, monitor savings goals, and understand spending patterns through a dashboard-driven experience and an AI-powered assistant.

## Live Deployment

The current live Render deployment uses:

- Frontend: `https://bf-web.onrender.com`
- Auth API: `https://bf-auth-api.onrender.com`
- Feature API: `https://bf-feature-api.onrender.com`

## Documentation

Project documentation is available in the `docs/` folder:

- Full application documentation: [docs/Budget-Flow-Application-Documentation.md](docs/Budget-Flow-Application-Documentation.md)
- Styled HTML version: [docs/Budget-Flow-Application-Documentation.html](docs/Budget-Flow-Application-Documentation.html)
- Shareable PDF version: [docs/Budget-Flow-Application-Documentation.pdf](docs/Budget-Flow-Application-Documentation.pdf)

The Markdown and HTML files are the editable source versions. The PDF is the polished handoff/export version.

## Product Scope

Budget Flow currently includes:

- email/password authentication
- Google sign-in support
- password reset workflow
- monthly budgeting and category limits
- transaction tracking and activity history
- savings goals and progress tracking
- reports and summary views
- multi-currency display support
- a Groq-powered finance assistant

## Repository Structure

- `Budget-Flow/` - auth frontend and auth backend
- `Budget-Flow-feature-ohene/Budget-Flow-feature-ohene/` - main application frontend
- `budget-flow-unified-backend/` - feature backend
- `deployment/` - deployment assets for container-based hosting
- `docs/` - project documentation and PDF export

## Additional Reference Files

- [PRODUCTION-DEPLOYMENT.md](PRODUCTION-DEPLOYMENT.md)
- [HOSTING-BEGINNER-GUIDE.md](HOSTING-BEGINNER-GUIDE.md)
- [HOSTING-HANDOVER.md](HOSTING-HANDOVER.md)
- [render.yaml](render.yaml)

## Notes

- The current production AI path is Groq.
- Flowise remains optional and is not required for the working Render deployment.
- Password reset delivery should use a production-ready email provider strategy that matches the selected Render plan.
