# Architecture Overview - Simple Guide

This document explains how the Excel AI Processor works in simple terms.

## What You're Running

When you start the application with `npm run dev:all`, you're running **three separate services** that work together:

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Computer                            │
│                                                              │
│  ┌────────────────┐    ┌────────────────┐    ┌───────────┐ │
│  │   Frontend     │    │   Backend      │    │  Python   │ │
│  │   (React)      │◄──►│   (Express)    │◄──►│  Service  │ │
│  │                │    │                │    │  (Flask)  │ │
│  │  Port: 5173    │    │  Port: 3000    │    │ Port:5000 │ │
│  └────────────────┘    └────────────────┘    └───────────┘ │
│         │                      │                     │       │
└─────────┼──────────────────────┼─────────────────────┼───────┘
          │                      │                     │
          │                      └─────────┬───────────┘
          │                                │
          ▼                                ▼
    Your Browser                   IBM WatsonX.ai
    (Chrome, etc.)                 (Cloud AI Service)
```

## The Three Services Explained

### 1. Frontend (Port 5173) 🎨

**What it is**: The user interface you see in your browser

**Technology**: React + Vite

**What it does**:
- Displays the web pages
- Handles file uploads
- Shows processing results
- Provides navigation

**Files**: Everything in the `src/` folder

**When you change it**: The page automatically refreshes (hot reload)

### 2. Backend API (Port 3000) 🔧

**What it is**: The main server that coordinates everything

**Technology**: Node.js + Express

**What it does**:
- Receives files from the frontend
- Stores uploaded files temporarily
- Calls WatsonX.ai for AI processing
- Sends requests to Python service
- Serves the built frontend in production
- Handles authentication (in production)

**Files**: `api/server.js` and related files

**When you change it**: You need to restart the server

### 3. Python Service (Port 5000) 🐍

**What it is**: Specialized service for document processing

**Technology**: Python + Flask

**What it does**:
- Advanced Excel file processing
- RAG (Retrieval Augmented Generation) features
- Delta Tool (comparing questionnaires)
- Document analysis

**Files**: Everything in `api/python-service/` folder

**When you change it**: You need to restart the service

## How They Work Together

### Example: Processing an Excel File

```
1. User uploads file in browser
   └─► Frontend (5173)

2. Frontend sends file to backend
   └─► Backend API (3000)

3. Backend saves file and extracts questions
   └─► Temporary storage

4. Backend sends questions to WatsonX.ai
   └─► IBM Cloud (WatsonX.ai)

5. WatsonX.ai generates answers
   └─► Returns to Backend

6. Backend creates new Excel file with answers
   └─► Temporary storage

7. Backend sends download link to frontend
   └─► Frontend (5173)

8. User downloads completed file
   └─► Browser downloads file
```

### Example: Using Delta Tool (Advanced Feature)

```
1. User uploads baseline questionnaire
   └─► Frontend (5173)

2. Frontend sends to backend
   └─► Backend API (3000)

3. Backend forwards to Python service
   └─► Python Service (5000)

4. Python service processes and stores in AstraDB
   └─► DataStax AstraDB (Cloud)

5. User uploads current year questionnaire
   └─► Same flow

6. Python service compares using AI
   └─► Finds matching questions
   └─► Copies previous answers
   └─► Identifies new questions

7. Results sent back through backend to frontend
   └─► User sees comparison results
```

## Data Flow

### File Upload Flow

```
Browser → Frontend → Backend → Disk Storage
                              ↓
                         Python Service (optional)
                              ↓
                         WatsonX.ai
                              ↓
                         Generated Answers
                              ↓
                         New Excel File
                              ↓
                         Browser Download
```

### Configuration Flow

```
.env file → Backend API → Environment Variables
                        ↓
api/python-service/.env → Python Service → Environment Variables
                                         ↓
                                    WatsonX.ai API
                                    AstraDB API (optional)
```

## What Needs What

### Frontend Needs:
- Backend API to be running (port 3000)
- Modern web browser

### Backend API Needs:
- WatsonX.ai credentials (API key + Project ID)
- Python service to be running (port 5000)
- Disk space for temporary files

### Python Service Needs:
- WatsonX.ai credentials (same as backend)
- AstraDB credentials (optional, for RAG features)
- Python packages installed

## Ports Explained

### Why Three Different Ports?

Each service runs on its own port so they don't conflict:

- **5173**: Frontend development server (Vite's default)
- **3000**: Backend API (common Node.js port)
- **5000**: Python service (common Flask port)

### In Production (OpenShift)

All services run in the same container but still use different ports internally. A reverse proxy (OAuth2 Proxy) sits in front and routes traffic:

```
Internet → OAuth2 Proxy (4180) → Backend (3000) → Python (5000)
                                      ↓
                                 Serves Frontend
```

## File Structure

```
excel-ai-processor/
├── src/                    # Frontend React code
│   ├── pages/             # Different pages
│   ├── components/        # Reusable UI components
│   └── App.tsx            # Main app component
│
├── api/                   # Backend code
│   ├── server.js          # Main backend server
│   └── python-service/    # Python service
│       ├── flask_api.py   # Python API server
│       ├── document_processor.py  # Document processing
│       └── delta_service.py       # Delta tool
│
├── uploads/               # Temporary file storage
├── dist/                  # Built frontend (after npm run build)
├── k8s/                   # Kubernetes/OpenShift configs
├── .env                   # Backend configuration
└── package.json           # Node.js dependencies
```

## Environment Variables Explained

### Why Two .env Files?

Because we have two separate services that need credentials:

1. **Root `.env`**: Used by Backend API (Node.js)
2. **`api/python-service/.env`**: Used by Python Service

Both need the same WatsonX credentials because both call the AI.

### Key Variables:

```env
# Required for AI to work
WATSONX_API_KEY=xxx          # Your IBM Cloud API key
WATSONX_PROJECT_ID=xxx       # Your WatsonX project ID

# Optional for advanced features
ASTRA_DB_API_ENDPOINT=xxx    # AstraDB endpoint
ASTRA_DB_APPLICATION_TOKEN=xxx  # AstraDB token

# Service configuration
PORT=3000                    # Backend port
PYTHON_SERVICE_PORT=5000     # Python service port
```

## Common Questions

### Q: Why do I need Python AND Node.js?

**A**: Different tools for different jobs:
- **Node.js**: Great for web servers and APIs (backend + frontend)
- **Python**: Better for AI/ML and data processing

### Q: Can I run just the frontend?

**A**: No, the frontend needs the backend to work. Always use `npm run dev:all`.

### Q: What happens if one service crashes?

**A**: The other services keep running, but features will break:
- Frontend crashes → Can't see the UI
- Backend crashes → Frontend can't save/process files
- Python crashes → Advanced features don't work

### Q: Do I need AstraDB?

**A**: No! The app works without it. AstraDB only enables:
- Delta Tool (comparing questionnaires)
- RAG features (better AI answers using stored knowledge)

### Q: Where are my files stored?

**A**: Temporarily in the `uploads/` folder. They're deleted after processing.

### Q: Is my data secure?

**A**: 
- Files are stored locally on your machine
- API calls to WatsonX.ai are encrypted (HTTPS)
- Files are deleted after processing
- In production, OAuth2 handles authentication

## Monitoring

### How to Check if Everything is Running

```bash
# Check all services
curl http://localhost:5173  # Frontend (should return HTML)
curl http://localhost:3000/api/health  # Backend
curl http://localhost:5000/health      # Python service

# Or open in browser:
# http://localhost:5173 - Should show the app
# http://localhost:3000/api/health - Should show {"status":"ok"}
# http://localhost:5000/health - Should show {"status":"ok"}
```

### Logs

Each service shows logs in the terminal:
- **Frontend**: Build info, hot reload messages
- **Backend**: API requests, file operations
- **Python**: Processing status, AI calls

## Performance

### What Takes Time?

1. **AI Processing**: 1-5 seconds per question
   - Depends on WatsonX.ai response time
   - Larger files take longer

2. **File Upload**: Instant to a few seconds
   - Depends on file size
   - 10MB limit by default

3. **Delta Tool**: 5-30 seconds
   - Depends on number of questions
   - Embedding generation takes time

### Tips for Faster Processing

- Process smaller batches of questions
- Use good context to help the AI
- Ensure stable internet connection
- Close other heavy applications

## Security Notes

### Development (Your Machine)

- No authentication required
- Services only accessible from your computer
- Files stored locally

### Production (OpenShift)

- OAuth2 authentication required
- HTTPS encryption
- Files stored in temporary volumes
- Non-root containers
- Network policies

## Next Steps

Now that you understand the architecture:

1. **Try it out**: Upload a test Excel file
2. **Explore the code**: Look at the files mentioned
3. **Customize**: Modify prompts, UI, or settings
4. **Deploy**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

## Need Help?

- **Setup issues**: See [GETTING_STARTED.md](./GETTING_STARTED.md)
- **Deployment**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Troubleshooting**: See [STARTUP_TROUBLESHOOTING.md](./STARTUP_TROUBLESHOOTING.md)