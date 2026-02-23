# Running Frontend + Backend Without Python Service

## Quick Answer

**Yes, you can run the frontend and backend without the Python service!** The backend will work, but certain features that require Python will not be available.

## How to Start Without Python

### Option 1: Start Frontend and Backend Only

```bash
# Terminal 1 - Start Backend (Node.js)
cd CRAFT_web_app/excel-ai-processor
npm run server

# Terminal 2 - Start Frontend (React)
cd CRAFT_web_app/excel-ai-processor
npm run dev
```

### Option 2: Modified dev:all Script

Edit `package.json` and temporarily change the `dev:all` script:

```json
"dev:all": "concurrently --names \"VITE,API\" --prefix-colors \"cyan,green\" \"npm run dev\" \"npm run server\""
```

Then run:
```bash
npm run dev:all
```

## What the Backend (Node.js) Actually Does

The Node.js backend (`api/server.js`) serves **THREE main purposes**:

### 1. 🎨 Serves the React Frontend (Production)

```javascript
// Line 42: Serves static files from the React build
app.use(express.static(path.join(__dirname, '../dist')));
```

**What it does:**
- In production, serves the built React app from the `dist/` folder
- Handles all frontend routes (SPA fallback)
- In development, Vite serves the frontend directly on port 5173

### 2. 📁 File Upload & Management

```javascript
// Lines 44-60: Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
```

**What it does:**
- Handles file uploads from the frontend
- Stores files temporarily in `uploads/` directory
- Validates file types and sizes
- Manages file cleanup after processing

**Endpoints:**
- `POST /api/upload` - Upload Excel files
- `GET /api/download/:filename` - Download processed files

### 3. 🔄 Proxy to Python Microservice

```javascript
// Line 16: Python service URL configuration
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5000';
```

**What it does:**
- Acts as a **proxy/gateway** between frontend and Python service
- Forwards requests to Python microservice
- Adds monitoring (Instana) and authentication headers
- Handles errors and provides consistent API responses

**Key Proxy Endpoints:**

#### Delta Tool Endpoints (Proxy to Python)
```javascript
// Lines 480-585: Upload baseline questionnaire
POST /api/delta/upload-baseline
  → Forwards to Python: POST http://localhost:5000/delta/upload-baseline

// Lines 590-695: Process current year vs baseline
POST /api/delta/process
  → Forwards to Python: POST http://localhost:5000/delta/process

// Lines 700-768: Download delta results
GET /api/delta/download/:filename
  → Forwards to Python: GET http://localhost:5000/delta/download/:filename
```

#### Document Processing Endpoint (Proxy to Python)
```javascript
// Lines 876-940: Process Excel with AI
POST /api/python/process
  → Forwards to Python: POST http://localhost:5000/process

// Lines 945-989: Download processed file
GET /api/python/download/:filename
  → Forwards to Python: GET http://localhost:5000/download/:filename
```

## What Happens Without Python Service?

### ✅ What WORKS Without Python:

1. **Frontend loads perfectly** - React app runs normally
2. **File uploads work** - Files are uploaded and stored
3. **User authentication** - OAuth2 headers are processed
4. **Monitoring** - Instana tracking works
5. **Health checks** - Backend health endpoint works
6. **Static file serving** - All frontend assets load

### ❌ What DOESN'T WORK Without Python:

1. **AI Document Processing** - Cannot process Excel files with AI
   - Endpoint: `POST /api/python/process`
   - Error: "ECONNREFUSED" or "Python service not available"

2. **Delta Tool** - Cannot compare questionnaires
   - Endpoint: `POST /api/delta/upload-baseline`
   - Endpoint: `POST /api/delta/process`
   - Error: Connection refused to Python service

3. **RAG Features** - No context-aware answer generation
   - Requires Python service with AstraDB

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    WITHOUT PYTHON SERVICE                    │
└─────────────────────────────────────────────────────────────┘

User Browser (5173)
    ↓
Frontend (React/Vite)
    ↓ API calls
Backend (Node.js:3000)
    ├─ ✅ Serves frontend (production)
    ├─ ✅ Handles file uploads
    ├─ ✅ Manages downloads
    ├─ ✅ Authentication
    ├─ ✅ Monitoring (Instana)
    └─ ❌ Cannot proxy to Python (service not running)

┌─────────────────────────────────────────────────────────────┐
│                     WITH PYTHON SERVICE                      │
└─────────────────────────────────────────────────────────────┘

User Browser (5173)
    ↓
Frontend (React/Vite)
    ↓ API calls
Backend (Node.js:3000)
    ├─ ✅ Serves frontend
    ├─ ✅ Handles file uploads
    ├─ ✅ Manages downloads
    ├─ ✅ Authentication
    ├─ ✅ Monitoring
    └─ ✅ Proxies to Python ──→ Python Service (5000)
                                    ├─ AI Processing
                                    ├─ Delta Tool
                                    ├─ RAG System
                                    └─ WatsonX.ai calls
```

## Why This Architecture?

### The Backend is a "Smart Proxy"

The Node.js backend doesn't do the heavy AI computation itself. Instead, it:

1. **Receives requests** from the frontend
2. **Validates and prepares** the data
3. **Forwards to Python** microservice for AI processing
4. **Adds monitoring** and authentication
5. **Returns results** to the frontend

### Benefits of This Design:

1. **Separation of Concerns**
   - Node.js: Web serving, file handling, authentication
   - Python: AI/ML processing, data science tasks

2. **Independent Scaling**
   - Scale Node.js for more users
   - Scale Python for more AI processing

3. **Technology Optimization**
   - Node.js: Great for I/O, web servers, proxying
   - Python: Great for AI/ML, data processing, scientific computing

4. **Deployment Flexibility**
   - Frontend/Backend: OpenShift (as required)
   - Python: IBM Code Engine (Python-friendly, auto-scaling)

## Testing Without Python

### 1. Start Backend and Frontend

```bash
# Terminal 1
cd CRAFT_web_app/excel-ai-processor
npm run server

# Terminal 2
cd CRAFT_web_app/excel-ai-processor
npm run dev
```

### 2. Access the Application

Open http://localhost:5173

### 3. What You Can Test

✅ **Frontend UI** - All pages load
✅ **Navigation** - All routes work
✅ **File Upload** - Can upload files
✅ **User Interface** - All components render

### 4. What Will Fail

❌ **Process Button** - Will show error: "Python service not available"
❌ **Delta Tool** - Will show connection error
❌ **AI Features** - Any AI-powered functionality

### Expected Error Messages

When trying to use AI features without Python:

```json
{
  "error": "connect ECONNREFUSED ::1:5000",
  "message": "Python service not available"
}
```

Or in the browser console:
```
Network error: Failed to fetch
Python service is not running on port 5000
```

## When to Run Without Python

### Good Use Cases:

1. **Frontend Development** - Working on UI/UX
2. **Testing File Uploads** - Verifying upload logic
3. **Authentication Testing** - Testing OAuth2 flow
4. **Layout/Styling** - CSS and component work
5. **Navigation** - Testing routing

### Bad Use Cases:

1. **Testing AI Features** - Need Python running
2. **End-to-End Testing** - Need full stack
3. **Demo/Presentation** - Need all features working
4. **Production Deployment** - Must have Python service

## Production Deployment

In production, you **MUST** have both:

1. **Frontend + Backend** deployed to OpenShift
2. **Python Microservice** deployed to IBM Code Engine

The backend's `PYTHON_SERVICE_URL` environment variable must point to the Code Engine URL:

```bash
# In OpenShift deployment
PYTHON_SERVICE_URL=https://craft-python-service.appdomain.cloud
```

## Summary

**Backend Role:**
- 🎨 Serves React frontend (production)
- 📁 Handles file uploads/downloads
- 🔄 Proxies requests to Python microservice
- 🔐 Manages authentication
- 📊 Adds monitoring (Instana)
- ⚠️ Does NOT do AI computation itself

**Python Service Role:**
- 🤖 AI document processing
- 🔍 Delta tool (questionnaire comparison)
- 📚 RAG system (context-aware answers)
- 🧠 WatsonX.ai integration
- 📊 Excel processing with AI

**Can Run Without Python?**
- ✅ Yes, for frontend development
- ❌ No, for AI features
- ❌ No, for production use

## Quick Commands Reference

```bash
# Run without Python (frontend dev only)
npm run server  # Terminal 1
npm run dev     # Terminal 2

# Run with Python (full features)
npm run dev:all  # Starts all 3 services

# Check what's running
lsof -i :3000   # Backend
lsof -i :5173   # Frontend
lsof -i :5000   # Python (should be empty if not running)