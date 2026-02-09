# AGENTS.md - Ask Mode

This file provides documentation context for agents answering questions about this repository.

## Critical Non-Obvious Documentation Context

### Monorepo Structure (Counterintuitive)
- Root directory contains React frontend (not typical monorepo pattern)
- `api/` directory contains Node.js backend with separate `package.json`
- `api/python-service/` contains optional Python RAG processor
- This structure differs from typical monorepos where root is shared config

### Dual-Mode Architecture
- **Standard Mode**: Node.js backend calls WatsonX.ai directly
- **Enhanced Mode**: Node.js delegates to Python Flask service for RAG-powered responses
- Python service is optional - backend works standalone without it

### Development vs Production Differences
- **Development**: Mock user data provided, no OAuth2
- **Production**: OAuth2 proxy provides user identity via headers (`x-forwarded-email`, `x-forwarded-user`)
- OAuth2 proxy skips auth for `/api/*` routes via `--skip-auth-regex=^/api/.*`

### Demo Mode Behavior
- Backend gracefully degrades when WatsonX credentials missing
- Returns `[DEMO MODE]` prefixed mock responses instead of failing
- Allows testing UI without configuring AI credentials

### Critical Startup Pattern
- Must run `npm run dev:all` to start both services
- Running `npm run dev` alone causes connection errors
- Frontend (port 5173) proxies to backend (port 3000)

### Instana Monitoring Integration
- Instana must be imported FIRST in `api/server.js`
- Stored globally in both `app.locals.instana` and `global.instana`
- Custom middleware tracks user journeys and file operations