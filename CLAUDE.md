# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Excel AI Processor is a fullstack web application for automating Excel questionnaire completion using IBM WatsonX.ai with RAG (Retrieval-Augmented Generation). Built with React/TypeScript frontend, Node.js/Express backend, and a **Python RAG service as the primary processing engine**.

**Key Technologies:**
- Frontend: React 18 + TypeScript + Vite + IBM Carbon Design System
- Backend: Node.js + Express.js (legacy endpoints, BYOK, OAuth)
- **Primary AI Engine:** Python Flask + RAG with AstraDB + IBM Granite embeddings
- AI Models: IBM WatsonX.ai (Mistral, Llama models)
- Vector DB: AstraDB with semantic search
- Monitoring: Instana SaaS
- Auth: OAuth2 Proxy (w3id SSO)
- Deployment: OpenShift/Kubernetes (Golden Path compliant)

**Key Features:**
- 🎯 **Smart Column Detection**: LLM automatically identifies question/answer columns
- 🔍 **Individual Question RAG**: Each question gets personalized context from AstraDB
- 📊 **Multi-Sheet Processing**: Handles complex Excel files with multiple sheets
- 🛡️ **Robust Error Handling**: XML fallback for corrupted files, continues on errors
- ⚡ **Direct Download**: Returns completed file in one request
- 📚 **Knowledge Base**: Leverages historical Q&A data for better answers

## Development Commands

### Setup
```bash
# Install Node.js dependencies
npm install

# Copy environment variables
cp .env.example .env
cp .env.example api/python-service/.env

# Setup Python virtual environment (if not already done)
cd api/python-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ../..
```

**Note:** The Python service uses a virtual environment located at `api/python-service/venv/`. The `npm run python-service` command automatically activates this venv before starting Flask.

### Running the Application

**⚠️ CRITICAL: Always start all three services together:**

```bash
# ✅ CORRECT - Start all services (Frontend + Backend + Python RAG)
npm run dev:all
```

This starts:
- Frontend dev server: http://localhost:5173
- Backend API server: http://localhost:3000
- Python RAG service: http://localhost:5000

**Running separately** (for debugging):
```bash
# Terminal 1 - Backend API
npm run server

# Terminal 2 - Frontend
npm run dev

# Terminal 3 - Python RAG Service
npm run python-service
```

**Common Errors:**
- Running `npm run dev` alone causes `ECONNREFUSED` errors because the backend won't be running
- Processing files without Python service running causes "Network error" - the frontend requires the Python RAG service for document processing

### Building
```bash
# Build frontend for production
npm run build

# Output directory: dist/
```

### Testing
```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Linting
```bash
npm run lint
```

## Architecture

### Fullstack Structure

This is a monorepo-style fullstack application where:
- **Root directory** contains the React frontend
- **`api/` directory** contains the Node.js backend
- **`api/python-service/`** contains the optional Python RAG processor

### Multi-Service Design

The application uses **Python RAG Service as the primary processing engine**:

**Current Architecture (Python RAG):**
- Frontend uploads Excel directly to Python Flask service (port 5000)
- Python service provides RAG-powered document completion
- Each question is processed individually with context from AstraDB
- Uses IBM Granite embeddings for semantic search
- Smart column detection using LLM
- Returns completed Excel file directly
- **Best quality answers** with knowledge base context

**Legacy Node.js Processing:**
- Express server has basic WatsonX.ai integration (port 3000)
- Processes all questions in batch
- No RAG enhancement
- Kept for backward compatibility and simple use cases

### Backend Server (`api/server.js`)

**Critical Initialization Order:**
```javascript
// IMPORTANT: Instana must be imported FIRST
import instana from './instana.js';
// Then other imports...
```

**Key Endpoints:**
- `GET /api/health` - Health check
- `POST /api/upload` - Upload Excel file
- `POST /api/process` - Process with AI
- `POST /api/generate` - Generate completed file
- `GET /api/download/:filename` - Download result
- `POST /api/validate` - Validate answers
- `GET /api/user` - Get user info from OAuth2 headers
- `POST /api/settings/watsonx` - Save WatsonX credentials (BYOK)
- `POST /api/settings/astradb` - Save AstraDB credentials (BYOK)

**Demo Mode:**
The backend gracefully degrades if WatsonX credentials are not configured, providing mock responses with `[DEMO MODE]` prefix.

### Frontend Structure

**Routes** (`src/App.tsx`):
- `/` - HomePage: Welcome and overview
- `/process` - ProcessPage: Upload and process Excel files
- `/validate` - ValidationPage: Review generated answers
- `/settings` - SettingsPage: BYOK configuration

**Key Components:**
- `MainLayout.tsx` - Carbon Design System layout with header/sidebar
- `WatsonOrchestrate.tsx` - Embedded chatbot widget
- Pages use `@tanstack/react-query` for data fetching
- Theme: Carbon `g100` (dark theme)

### Python RAG Service (`api/python-service/`)

**Primary processing engine for Excel questionnaires with RAG enhancement.**

**Files:**
- `flask_api.py` - Flask REST API (port 5000)
- `document_processor.py` - RAG processing logic with smart column detection
- `requirements.txt` - Python dependencies
- `.env` - Service-specific environment variables (separate from root .env)

**Key Features:**
- **Smart Column Detection**: Uses LLM to automatically identify question/answer columns
- **Multi-Sheet Processing**: Handles multiple sheets, skips instruction/legend sheets automatically
- **XML Fallback**: Robust handling of corrupted Excel files using XML parsing
- **Individual Question RAG**: Each question gets its own context retrieval from AstraDB
- **Direct File Download**: Returns completed Excel file directly in HTTP response
- **Error Recovery**: Continues processing even if individual questions fail

**Endpoints:**
- `GET /health` - Health check and RAG system status
- `POST /process` - Process Excel with RAG (returns completed file directly)
- `POST /detect-columns` - Auto-detect Q&A columns
- Delta Tool endpoints (for questionnaire comparison)

**Processing Flow:**
```
1. Upload Excel file → POST /process
2. For each sheet (skip instruction/legend sheets):
   a. Smart column detection (LLM identifies Q&A columns by number)
      - Analyzes first 5 rows of data
      - Returns column indices (1, 2, 3...) not names
      - Auto-detects for 2-column sheets (no LLM call)
      - Works with ANY column names (IBM Overview, Status, etc.)
   b. For each unanswered question:
      - Retrieve top 5 similar Q&As from AstraDB (similarity > 0.5)
      - Generate answer using WatsonX + RAG context
      - Fill answer into Excel with proper formatting
3. Return completed Excel file directly (auto-download in browser)
```

**Smart Column Detection Details:**

The system uses LLM to identify Q&A columns intelligently:
- **Input:** Sample data (first 5 rows) + column list
- **Prompt:** "Which column NUMBER (1,2,3...) has questions vs answers?"
- **Output:** Column indices (e.g., question=2, answer=3)
- **Fallback:** If 2 columns exist, auto-uses columns 1 and 2

This approach works with any Excel layout:
- ✅ Different column names ("Question", "IBM Overview", "Description")
- ✅ Multiple columns (ID, Category, Question, Answer, Status)
- ✅ Headers in different languages
- ✅ No headers at all

**Environment Variables Required:**
- `WATSON_URL` - Base WatsonX.ai URL (e.g., `https://ca-tor.ml.cloud.ibm.com`)
- `IBM_WATSONX_API_KEY` - API key
- `IBM_WATSONX_PROJECT_ID` - Project ID
- `WATSON_TEXT_MODEL` - Model name (e.g., `mistralai/mistral-small-3-1-24b-instruct-2503`)
- `ASTRA_DB_API_ENDPOINT` - AstraDB endpoint URL
- `ASTRA_DB_APPLICATION_TOKEN` - AstraDB token
- `PYTHON_SERVICE_PORT` - Port number (default: 5000)

## Environment Configuration

### Required Variables (`.env`)

**⚠️ IMPORTANT:** Python service uses `api/python-service/.env` (separate file)

**WatsonX.ai (Both root `.env` and `api/python-service/.env`):**
```bash
# Base URL only - do NOT include /ml/v1/text/chat endpoint
WATSON_URL=https://ca-tor.ml.cloud.ibm.com
IBM_WATSONX_API_KEY=your_key_here
IBM_WATSONX_PROJECT_ID=your_project_id_here
WATSON_TEXT_MODEL=mistralai/mistral-small-3-1-24b-instruct-2503
```

**Note:** Node.js backend constructs full endpoint URL automatically. Python service also constructs it internally.

**Instana Monitoring:**
```bash
INSTANA_REPORTING_URL=https://ibmdevsandbox-instanaibm.instana.io
INSTANA_AGENT_KEY=your_agent_key_here
```

**Application:**
```bash
NODE_ENV=development
PORT=3000
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=.xlsx,.xls
```

**Frontend (Vite requires `VITE_` prefix):**
```bash
VITE_API_URL=http://localhost:3000
```

### OAuth2 in Production

In production (OpenShift), user identity comes from OAuth2 proxy headers:
- `x-forwarded-email` or `x-auth-request-email` - User's email
- `x-forwarded-user` or `x-auth-request-user` - User's name

In development, mock user data is provided.

## Deployment

### Golden Path Compliance

This project follows IBM's Golden Path deployment pattern (see `GOLDEN_PATH_COMPLIANCE.md`):
- `.goldenpath.yml` - Deployment configuration
- `Dockerfile` - Multi-stage build
- `k8s/` - Kubernetes manifests
- Auto-configured OAuth2 proxy
- Integrated Instana monitoring

### Docker Build

The Dockerfile uses multi-stage build:
1. **Builder stage**: Build frontend with Vite, install backend deps
2. **Final stage**: Copy artifacts, install Python, expose port 3000

```bash
docker build -t excel-ai-processor .
```

### Kubernetes Deployment

**Namespace:** `content-studio-platform`

**Container Structure** (3 containers in pod):
1. `frontend` - Serves React build (port 8080)
2. `backend` - Express API (port 3000)
3. `oauth2-proxy` - SSO gateway (port 4180)

**Deploy:**
```bash
# Create secrets first
kubectl create secret generic watsonx-secrets \
  --from-literal=api-key=YOUR_KEY \
  --from-literal=project-id=YOUR_PROJECT \
  -n content-studio-platform

kubectl create secret generic instana-secrets \
  --from-literal=agent-key=YOUR_KEY \
  -n content-studio-platform

# Apply configs
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/route.yaml
```

See `DEPLOYMENT.md` for detailed deployment instructions.

## Excel Processing Flow

### Current Architecture: Direct Python RAG Processing

**Frontend → Python Service → Completed File Download**

1. **Upload & Process** (`POST http://localhost:5000/process`):
   - Frontend uploads Excel file directly to Python service
   - No intermediate storage on Node.js server
   - File processed in memory with temporary files

2. **Smart Column Detection**:
   - LLM analyzes sample data (first 5 rows)
   - Identifies question/answer columns by NUMBER (1, 2, 3...)
   - Auto-detects for 2-column sheets
   - Works with any column names (not just "Question"/"Answer")

3. **Multi-Sheet Processing**:
   - Automatically skips instruction/legend/dv_sheet sheets
   - Processes each data sheet independently
   - Handles corrupted Excel files with XML fallback

4. **Individual Question RAG Processing**:
   - For each unanswered question:
     - Generate embedding using IBM Granite model
     - Search AstraDB for top 5 similar Q&As (similarity > 0.5)
     - Construct prompt with relevant context examples
     - Call WatsonX.ai with question + RAG context
     - Fill answer into Excel with proper formatting

5. **Direct File Download**:
   - Returns completed Excel file in HTTP response
   - Browser auto-downloads as `filename_completed.xlsx`
   - No separate download endpoint needed

### Legacy Node.js Flow (Deprecated)

The old workflow still exists but is **not used by the frontend**:
- `POST /api/upload` - Parse and extract questions
- `POST /api/process` - Batch process all questions (no RAG)
- `POST /api/generate` - Update Excel with answers
- `GET /api/download/:filename` - Download result

**Why Python RAG is Better:**
- ✅ Individual question processing with RAG context
- ✅ Smart column detection handles any Excel layout
- ✅ Multi-sheet processing with auto-skipping
- ✅ Corrupted file handling with XML fallback
- ✅ Better answer quality from AstraDB knowledge base
- ✅ Simpler flow (one request instead of 4)

## Instana Monitoring

### Integration Pattern

```javascript
// 1. Import Instana FIRST in server.js
import instana from './instana.js';

// 2. Store globally for middleware
app.locals.instana = instana;
global.instana = instana;

// 3. Add middleware
app.use(instanaTrackingMiddleware);

// 4. Track events
trackEvent('file_uploaded', { filename, size });
trackError(error, { operation: 'file_upload' });
```

### Custom Tracking

The `instana-middleware.js` module provides:
- `instanaTrackingMiddleware` - Adds custom tags to traces
- `trackEvent(name, metadata)` - Log custom events
- `trackError(error, context)` - Log errors with context

**Tracked Operations:**
- File uploads
- AI processing
- File generation
- Downloads
- Validation
- Settings updates

**User Journey Tags:**
- User email/name from OAuth2 headers
- File metadata (name, size, mimetype)
- Operation types (ai_processing, validation)

## Development Patterns

### Adding New API Endpoints

1. Add route in `api/server.js`:
```javascript
app.post('/api/new-endpoint', async (req, res) => {
  try {
    trackEvent('new_operation_started', { /* metadata */ });
    // ... logic
    res.json({ success: true, data });
  } catch (error) {
    trackError(error, { operation: 'new_operation' });
    res.status(500).json({ error: error.message });
  }
});
```

2. Add frontend hook in appropriate page component
3. Use `@tanstack/react-query` for data fetching

### Adding New Pages

1. Create page component in `src/pages/`
2. Add route in `src/App.tsx`:
```tsx
<Route path="new-page" element={<NewPage />} />
```
3. Add navigation link in `src/layout/MainLayout.tsx`

### Working with Carbon Design

Use IBM Carbon React components:
```tsx
import { Button, DataTable, Modal } from '@carbon/react';
```

The app uses Carbon's `g100` theme (dark mode).

## File Upload Handling

### Multer Configuration

- **Storage:** `uploads/` directory (auto-created)
- **Filename:** `{fieldname}-{timestamp}-{random}.{ext}`
- **Size Limit:** 10MB (configurable via `MAX_FILE_SIZE`)
- **Allowed Types:** `.xlsx`, `.xls` (configurable via `ALLOWED_FILE_TYPES`)

### Error Handling

File upload errors are caught and returned with appropriate status codes:
- 400: No file, invalid type
- 500: Processing error

## BYOK (Bring Your Own Key)

The application supports user-specific credentials via the Settings page:

**Endpoints:**
- `POST /api/settings/watsonx` - Save WatsonX credentials
- `POST /api/settings/astradb` - Save AstraDB credentials
- `POST /api/settings/orchestrate` - Save Watson Orchestrate credentials

**Security Note:** Currently stores credentials in memory. TODO: Implement encrypted database storage.

## Important Notes

### Production Serving

In production, the Express server serves both:
1. Static frontend files from `dist/`
2. API endpoints at `/api/*`
3. SPA fallback (serves `index.html` for all non-API routes)

### Proxy Configuration

During development, Vite proxies API requests:
```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

### Health Checks

The deployment includes liveness and readiness probes:
- **Liveness:** `GET /api/health`
- **Readiness:** `GET /api/health`

Both should return `{ status: "ok" }`.

## Troubleshooting

### Python Service Not Running

**Error:** "Network error. Make sure Python service is running on port 5000."

**Solution:**
1. Check if Python service is running: `lsof -i :5000`
2. Start all services: `npm run dev:all`
3. Or start Python service separately: `npm run python-service`
4. Check Python service logs for errors (look for model initialization, AstraDB connection)

### Environment Variable Issues

**Error:** "Missing version in credentials for Cloud Pak for Data" or "Column names not found"

**Solution:**
1. Verify `api/python-service/.env` exists and has correct values
2. Check `WATSON_URL` is base URL only (e.g., `https://ca-tor.ml.cloud.ibm.com`)
3. **Do NOT** include `/ml/v1/text/chat` endpoint in URL
4. Ensure all required variables are set:
   - `WATSON_URL`
   - `IBM_WATSONX_API_KEY`
   - `IBM_WATSONX_PROJECT_ID`
   - `WATSON_TEXT_MODEL`
   - `ASTRA_DB_API_ENDPOINT`
   - `ASTRA_DB_APPLICATION_TOKEN`

### Column Detection Failures

**Error:** "Could not detect Q&A columns" or "Sheets processed: 0/1"

**Solution:**
1. Check Excel file has at least 2 columns
2. Ensure questions are text (not just numbers or empty cells)
3. Verify LLM model is accessible and responding
4. Try with a simple 2-column file (auto-detection should work)
5. Check Python service logs for LLM response details

### File Not Downloading

**Error:** File processes successfully but doesn't download

**Solution:**
1. Check browser's download settings (not blocking popups)
2. Look in browser console for errors
3. Verify Python service returned file (check Content-Type header)
4. Try manually accessing: `http://localhost:5000/health`

### Connection Refused Errors

If you see `ECONNREFUSED` errors:
1. Ensure all services are running: `npm run dev:all`
2. Check ports: `lsof -i :3000,5000,5173`
3. Verify no other services using these ports

See `STARTUP_TROUBLESHOOTING.md` for detailed troubleshooting.

### Instana Not Tracking

If Instana isn't tracking:
1. Verify `INSTANA_AGENT_KEY` is set
2. Check Instana is imported FIRST in `server.js`
3. Check logs for Instana connection errors

### OAuth2 Issues in Production

1. Verify OAuth2 proxy logs: `kubectl logs -c oauth2-proxy`
2. Check skip-auth regex: `--skip-auth-regex=^/api/.*`
3. Verify secrets: `kubectl get secret excel-ai-processor-secrets`

## Additional Documentation

- `README.md` - General overview and features
- `DEPLOYMENT.md` - Detailed deployment guide
- `GOLDEN_PATH_COMPLIANCE.md` - Deployment pattern compliance
- `QUICK_START.md` - Quick start guide
- `STARTUP_TROUBLESHOOTING.md` - Common startup issues
- `INTEGRATION_GUIDE.md` - Integration instructions
- `BYOK_GUIDE.md` - Bring Your Own Key guide
