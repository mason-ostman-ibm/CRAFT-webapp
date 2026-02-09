# AGENTS.md - Plan Mode

This file provides architectural context for agents planning work in this repository.

## Critical Non-Obvious Architecture Patterns

### Counterintuitive Monorepo Structure
- Root directory = React frontend (unusual for monorepos)
- `api/` directory = Node.js backend with separate dependencies
- `api/python-service/` = Optional Python RAG service
- Frontend proxies `/api/*` to backend (configured in `vite.config.ts`)

### Dual-Service Architecture
- **Standard Mode**: Express server → WatsonX.ai directly
- **Enhanced Mode**: Express server → Python Flask → AstraDB + WatsonX.ai
- Python service is optional, not required for basic functionality
- Backend gracefully degrades to demo mode when credentials missing

### Critical Initialization Dependencies
- Instana MUST be imported first in `api/server.js` (hard requirement)
- Must be stored in both `app.locals.instana` AND `global.instana`
- Violating import order breaks monitoring completely

### Production vs Development Architecture
- **Production**: 3-container pod (frontend, backend, oauth2-proxy)
- **Development**: 2 processes (frontend on 5173, backend on 3000)
- OAuth2 proxy skips auth for `/api/*` in production
- User identity from headers in production, mocked in development

### Deployment Pattern (Golden Path)
- `.goldenpath.yml` defines fullstack deployment
- OAuth2 auto-configured with skip-auth regex for API routes
- Secrets managed via Kubernetes secrets (not environment files)
- Instana monitoring integrated at deployment level

### File Upload Flow
- Files stored in `uploads/` directory (auto-created)
- Processed files saved as `processed-{timestamp}.xlsx`
- Files remain on server until downloaded
- Multer handles uploads with size/type validation