# PR: Enable Python Flask Service in OpenShift Deployment

## 🎯 Problem Statement

The excel-ai-processor application has a **Python Flask service** (`api/python-service/flask_api.py`) that provides critical functionality including:
- RAG-powered document processing
- Delta Tool for questionnaire comparison
- Advanced Excel processing features

However, the **Golden Path deployment only runs the Node.js server**, causing the Python service to never start in the OpenShift cluster. This results in:
- ❌ 404 errors when accessing Python endpoints
- ❌ `SyntaxError: Unexpected token '<'` errors in the frontend
- ❌ Complete failure of Python-dependent features

## 🔍 Root Cause

The `.goldenpath.yml` configuration specifies:
```yaml
kind: fullstack
backend:
  path: api
  port: 3000
```

This only runs the Node.js server. The Python service (port 5000) is never started, even though:
1. The Node.js server has proxy routes for Python endpoints (`/api/python/process`, `/api/python/download`)
2. The `package.json` has a `dev:all` script that starts both services locally
3. The Python service is fully implemented and functional

## ✅ Solution

Implement **automatic Python service startup** within the Node.js server using child process management:

### Changes Made:

#### 1. **Modified `api/server.js`**
- Added `spawn` import from `child_process`
- Created `startPythonService()` function that:
  - Spawns Python Flask service as a child process
  - Captures and logs Python stdout/stderr
  - Handles graceful startup and error cases
  - Waits for service to be ready
- Added graceful shutdown handlers for `SIGTERM` and `SIGINT`
- Integrated Python service startup into server initialization

#### 2. **Updated `.goldenpath.yml`**
- Added explicit `command: node server.js` to backend config
- Added Python service environment variables:
  - `PYTHON_SERVICE_URL: "http://localhost:5000"`
  - `PYTHON_SERVICE_PORT: "5000"`
- Added optional AstraDB configuration for RAG features
- Documented that Node.js will auto-start Python service

## 🚀 How It Works

### Deployment Flow:
1. Golden Path cronjob triggers deployment
2. OpenShift starts the `app` container running `node server.js`
3. Node.js server starts on port 3000
4. **Node.js automatically spawns Python service** on port 5000
5. Both services run in the same container
6. Node.js proxies Python requests to `localhost:5000`

### Architecture:
```
┌─────────────────────────────────────────┐
│  OpenShift Pod (app container)          │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  Node.js Express (port 3000)       │ │
│  │  - Serves frontend                 │ │
│  │  - Handles API routes              │ │
│  │  - Proxies to Python service       │ │
│  │  - Spawns Python as child process  │ │
│  └────────────────────────────────────┘ │
│              ↓ spawn                     │
│  ┌────────────────────────────────────┐ │
│  │  Python Flask (port 5000)          │ │
│  │  - Document processing             │ │
│  │  - Delta Tool                      │ │
│  │  - RAG features                    │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## 🔧 Technical Details

### Python Service Startup Logic:
```javascript
function startPythonService() {
  // Check if Python service exists
  // Spawn python3 flask_api.py
  // Set environment variables (PORT, etc.)
  // Capture stdout/stderr for logging
  // Handle errors gracefully
  // Wait 2 seconds for startup
}
```

### Graceful Shutdown:
- Listens for `SIGTERM` and `SIGINT` signals
- Sends `SIGTERM` to Python process
- Waits 5 seconds, then force kills if needed
- Ensures clean shutdown in Kubernetes

### Error Handling:
- If Python service file doesn't exist: **Warns but continues** (Node.js features still work)
- If Python fails to start: **Logs error but continues** (degraded mode)
- If Python crashes: **Logs exit code** (can be restarted by Kubernetes)

## 📋 Testing Checklist

### Local Testing:
- [ ] Run `npm run server` - should start both Node.js and Python
- [ ] Check logs for "🐍 Starting Python service..."
- [ ] Check logs for "✅ Python service started successfully"
- [ ] Test `/api/health` endpoint
- [ ] Test `/api/python/process` endpoint with file upload
- [ ] Verify graceful shutdown with Ctrl+C

### OpenShift Testing:
- [ ] Deploy to cluster
- [ ] Check pod logs for Python service startup
- [ ] Test frontend at `https://excel-ai-processor-np.dinero.techzone.ibm.com/`
- [ ] Upload Excel file and process
- [ ] Verify no 404 or JSON parse errors
- [ ] Check Instana for successful requests

## 🎁 Benefits

1. **✅ Single Container Deployment** - No need for multi-container pods
2. **✅ Golden Path Compatible** - Works with existing cronjob automation
3. **✅ Automatic Startup** - No manual intervention required
4. **✅ Graceful Degradation** - Node.js features work even if Python fails
5. **✅ Proper Logging** - Python output visible in pod logs
6. **✅ Clean Shutdown** - Handles Kubernetes termination signals
7. **✅ OAuth2 Fixed** - Use same credentials as your-projects

## 🔐 OAuth2 Configuration

**IMPORTANT**: Also update the OAuth2 credentials to match your-projects:

```bash
kubectl patch secret excel-ai-processor-secrets -n content-studio-platform \
  --type='json' \
  -p='[
    {"op": "replace", "path": "/data/OAUTH2_PROXY_CLIENT_ID", "value": "TkdJNU9XRXdNMkl0WW1NellTMDA="},
    {"op": "replace", "path": "/data/OAUTH2_PROXY_CLIENT_SECRET", "value": "T1RaallXSXdOMkV0TlRWaU1DMDA="}
  ]'

kubectl rollout restart deployment excel-ai-processor -n content-studio-platform
```

And add the redirect URL to w3id client:
- `https://excel-ai-processor-np.dinero.techzone.ibm.com/oauth2/callback`

## 📝 Files Changed

- `api/server.js` - Added Python service management
- `.goldenpath.yml` - Updated configuration with Python env vars

## 🚦 Deployment Steps

1. Merge this PR
2. Golden Path cronjob will auto-deploy
3. Update OAuth2 credentials (see above)
4. Verify deployment in OpenShift
5. Test application functionality

## 🎉 Expected Outcome

After deployment:
- ✅ Frontend loads without errors
- ✅ Python endpoints return valid JSON
- ✅ File processing works end-to-end
- ✅ Delta Tool features available
- ✅ RAG processing functional (if AstraDB configured)
- ✅ OAuth2 authentication works

---

**Made with Bob** 🤖