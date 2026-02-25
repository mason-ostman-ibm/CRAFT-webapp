# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Critical Non-Obvious Patterns

### Instana Initialization (CRITICAL)
- Instana MUST be imported FIRST in `api/server.js` before any other modules
- Must be stored in BOTH `app.locals.instana` AND `global.instana` for middleware access
- Violating import order breaks monitoring

### Demo Mode Behavior
- Backend gracefully degrades when WatsonX credentials are missing
- Returns mock responses prefixed with `[DEMO MODE]` instead of failing
- Check `IBM_WATSONX_API_KEY` and `IBM_WATSONX_PROJECT_ID` env vars

### Monorepo Structure (Counterintuitive)
- Root directory = React frontend (not typical monorepo pattern)
- `api/` directory = Node.js backend (proxies to Python microservice)
- Python microservice = Deployed separately on IBM Code Engine
- Frontend proxies `/api/*` to backend at port 3000 (configured in vite.config.ts)

### Development Commands
- **ALWAYS use `npm run dev:all`** to start both frontend and backend together
- Running `npm run dev` alone causes `ECONNREFUSED` errors (backend won't be running)
- Backend runs on port 3000, frontend on port 5173

### Production OAuth2 Configuration
- OAuth2 proxy skips authentication for API routes: `--skip-auth-regex=^/api/.*`
- User identity comes from headers: `x-forwarded-email`, `x-forwarded-user`
- In development, mock user data is provided

### UI Theme
- Frontend uses Carbon Design System `g100` theme (dark mode)
- Theme is hardcoded in `src/App.tsx`, not configurable

### Python Microservice
- Python microservice deployed on IBM Code Engine (separate from webapp)
- Backend proxies requests to microservice via PYTHON_SERVICE_URL
- Provides RAG-powered processing with AstraDB + IBM Granite embeddings