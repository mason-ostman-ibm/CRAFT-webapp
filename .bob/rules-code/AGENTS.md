# AGENTS.md - Code Mode

This file provides coding-specific guidance for agents working in this repository.

## Critical Coding Patterns (Non-Obvious Only)

### Instana Import Order (CRITICAL)
```javascript
// api/server.js - MUST be first import
import instana from './instana.js';
// Then other imports...
```
- Violating this order breaks monitoring
- Store in both `app.locals.instana` AND `global.instana`

### Demo Mode Graceful Degradation
- Backend returns `[DEMO MODE]` prefixed responses when credentials missing
- Check `IBM_WATSONX_API_KEY` and `IBM_WATSONX_PROJECT_ID` before calling AI
- Don't throw errors - provide mock responses instead

### File Structure (Counterintuitive)
- Root `package.json` = frontend dependencies
- `api/` has separate `package.json` for backend
- Frontend proxies `/api/*` to `http://localhost:3000` (see `vite.config.ts`)

### Development Workflow
- ALWAYS run `npm run dev:all` (not `npm run dev` alone)
- Backend must be running on port 3000 for frontend to work
- Frontend runs on port 5173

### Carbon Design System
- Theme is hardcoded to `g100` (dark mode) in `src/App.tsx`
- Use `@carbon/react` components, not custom UI components
- Import icons from `@carbon/icons-react`

### Testing
- Uses Vitest with React Testing Library
- Run with `npm test`, `npm run test:ui`, or `npm run test:coverage`
- Test files use `.test.tsx` or `.spec.tsx` extensions