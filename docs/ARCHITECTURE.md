# CRAFT Application Architecture

## Overview

The CRAFT (Compliance Risk Assessment Framework Tool) application uses a **microservices architecture** with separate deployments for the frontend/backend and Python AI services.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Browser                              │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              OpenShift/DINERO Cluster                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         React Frontend + Node.js Backend              │  │
│  │  - Carbon Design System UI                            │  │
│  │  - Express.js API Server                              │  │
│  │  - File Upload/Download                               │  │
│  │  - Request Proxying                                   │  │
│  └──────────────────────┬────────────────────────────────┘  │
└─────────────────────────┼────────────────────────────────────┘
                          │ HTTP/REST API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              IBM Code Engine                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Python Microservice (Flask)                   │  │
│  │  - Document Processing                                │  │
│  │  - Delta Tool                                         │  │
│  │  - RAG System                                         │  │
│  │  - Smart Column Detection                            │  │
│  └──────────────┬────────────────┬───────────────────────┘  │
└─────────────────┼────────────────┼──────────────────────────┘
                  │                │
                  ▼                ▼
         ┌────────────────┐  ┌──────────────┐
         │ IBM WatsonX.ai │  │  AstraDB     │
         │  - LLM Models  │  │  - RAG Store │
         │  - Generation  │  │  - Vectors   │
         └────────────────┘  └──────────────┘
```

## Components

### 1. Frontend (React + Carbon Design)

**Location**: `CRAFT_web_app/excel-ai-processor/src/`

**Technology Stack**:
- React 18
- IBM Carbon Design System
- React Router
- Vite (build tool)

**Responsibilities**:
- User interface for file upload
- Document processing workflow
- Delta tool interface
- Results visualization
- Settings management

**Deployment**: OpenShift/DINERO cluster

### 2. Backend (Node.js + Express)

**Location**: `CRAFT_web_app/excel-ai-processor/api/server.js`

**Technology Stack**:
- Node.js
- Express.js
- Multer (file uploads)
- XLSX (Excel processing)

**Responsibilities**:
- Serve React frontend
- Handle file uploads
- Proxy requests to Python microservice
- Manage file downloads
- Instana monitoring integration

**Deployment**: OpenShift/DINERO cluster (same pod as frontend)

**Key Endpoints**:
- `POST /api/upload` - Upload Excel files
- `POST /api/process` - Process with AI (proxies to Python)
- `GET /api/download/:filename` - Download processed files
- `POST /api/delta/*` - Delta tool endpoints (proxy to Python)

### 3. Python Microservice (Flask)

**Location**: `CRAFT-python-microservice/`

**Technology Stack**:
- Python 3.11
- Flask
- IBM WatsonX.ai SDK
- Pandas, OpenPyXL
- Sentence Transformers
- AstraDB (optional)

**Responsibilities**:
- AI-powered document processing
- Smart column detection using LLM
- RAG (Retrieval-Augmented Generation)
- Delta tool (baseline comparison)
- Answer generation with context

**Deployment**: IBM Code Engine (containerized)

**Key Endpoints**:
- `GET /health` - Health check
- `POST /process` - Process Excel with AI
- `POST /delta/upload-baseline` - Upload baseline questionnaire
- `POST /delta/process` - Process current year vs baseline
- `GET /delta/download/:filename` - Download delta results
- `GET /delta/baseline-info` - Get baseline information
- `DELETE /delta/baseline` - Clear baseline

## Communication Flow

### Document Processing Flow

1. **User uploads Excel file** → React Frontend
2. **Frontend sends file** → Node.js Backend (`/api/upload`)
3. **Backend saves file** → Local filesystem
4. **User clicks "Process"** → Frontend
5. **Frontend requests processing** → Node.js Backend (`/api/process`)
6. **Backend proxies request** → Python Microservice (`/process`)
7. **Python service**:
   - Detects Q&A columns using LLM
   - Retrieves relevant context from AstraDB (RAG)
   - Generates answers using WatsonX.ai
   - Creates completed Excel file
8. **Python returns result** → Node.js Backend
9. **Backend returns to** → Frontend
10. **User downloads file** → Backend → Python Microservice

### Delta Tool Flow

1. **User uploads baseline** → Frontend
2. **Frontend sends to** → Backend → Python (`/delta/upload-baseline`)
3. **Python ingests baseline** → AstraDB (vector embeddings)
4. **User uploads current year** → Frontend
5. **Frontend sends to** → Backend → Python (`/delta/process`)
6. **Python compares**:
   - Finds similar questions using vector search
   - Optionally verifies with LLM
   - Generates answers for unmatched questions
7. **Python returns results** → Backend → Frontend
8. **User downloads comparison** → Backend → Python

## Deployment Strategy

### Why Separate Deployments?

1. **OpenShift Limitation**: The DINERO OpenShift cluster's cron job doesn't support Python deployments
2. **Scalability**: Python microservice can scale independently based on AI workload
3. **Resource Optimization**: Code Engine provides better resource management for compute-intensive AI tasks
4. **Cost Efficiency**: Code Engine can scale to zero when not in use
5. **Flexibility**: Easier to update Python dependencies without affecting frontend

### Deployment Locations

| Component | Platform | Reason |
|-----------|----------|--------|
| React Frontend | OpenShift/DINERO | Required by organization policy |
| Node.js Backend | OpenShift/DINERO | Co-located with frontend |
| Python Microservice | IBM Code Engine | Python support, auto-scaling, cost-effective |

## Environment Configuration

### Frontend/Backend (.env)

```bash
# Node.js server configuration
PORT=3000
NODE_ENV=production

# Python microservice URL (Code Engine)
PYTHON_SERVICE_URL=https://craft-python-service.appdomain.cloud

# Optional: Direct WatsonX access (if needed)
IBM_WATSONX_API_KEY=xxx
IBM_WATSONX_PROJECT_ID=xxx

# Monitoring
INSTANA_AGENT_KEY=xxx
```

### Python Microservice (.env)

```bash
# Service configuration
PORT=8080
FLASK_ENV=production

# IBM WatsonX.ai (Required)
IBM_WATSONX_API_KEY=xxx
IBM_WATSONX_PROJECT_ID=xxx
WATSON_URL=https://us-south.ml.cloud.ibm.com

# AstraDB (Optional - for RAG)
ASTRA_DB_API_ENDPOINT=xxx
ASTRA_DB_APPLICATION_TOKEN=xxx

# Delta Tool settings
DELTA_SIMILARITY_THRESHOLD=0.85
DELTA_ENABLE_LLM_VERIFICATION=true
```

## Security Considerations

1. **HTTPS**: All external communication uses HTTPS
2. **Secrets Management**: 
   - OpenShift: Kubernetes Secrets
   - Code Engine: IBM Cloud Secrets Manager
3. **CORS**: Configured to allow frontend domain only
4. **File Validation**: Size limits and type checking
5. **Authentication**: OAuth2 proxy on OpenShift (production)

## Monitoring & Observability

### Instana Integration

- **Frontend/Backend**: Instana agent tracks all requests
- **Python Microservice**: Health checks and logging
- **Metrics**: Response times, error rates, throughput

### Logging

- **Node.js**: Console logs with request tracking
- **Python**: Structured logging with log levels
- **Code Engine**: Built-in log aggregation

## Scaling

### Frontend/Backend (OpenShift)

- Horizontal Pod Autoscaling (HPA)
- Based on CPU/memory usage
- Min: 2 replicas, Max: 10 replicas

### Python Microservice (Code Engine)

- Auto-scaling based on requests
- Min: 1 instance (always available)
- Max: 5 instances
- Scale-to-zero option for development

## Development Workflow

### Local Development

1. **Start Python microservice**:
   ```bash
   cd CRAFT-python-microservice
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python flask_api.py
   ```

2. **Start Node.js backend**:
   ```bash
   cd CRAFT_web_app/excel-ai-processor
   npm run server
   ```

3. **Start React frontend**:
   ```bash
   cd CRAFT_web_app/excel-ai-processor
   npm run dev
   ```

### Deployment

1. **Deploy Python microservice to Code Engine**:
   ```bash
   cd CRAFT-python-microservice
   ./deploy.sh
   ```

2. **Update frontend .env with Code Engine URL**:
   ```bash
   PYTHON_SERVICE_URL=https://your-app.appdomain.cloud
   ```

3. **Deploy frontend/backend to OpenShift**:
   ```bash
   cd CRAFT_web_app/excel-ai-processor
   # Use existing OpenShift deployment process
   ```

## Troubleshooting

### Python Microservice Not Responding

1. Check Code Engine logs:
   ```bash
   ibmcloud ce application logs --name craft-python-service
   ```

2. Verify environment variables are set
3. Test health endpoint: `curl https://your-app.appdomain.cloud/health`

### Frontend Can't Connect to Python Service

1. Verify `PYTHON_SERVICE_URL` in frontend .env
2. Check CORS configuration in Python service
3. Verify Code Engine application is running

### File Upload Issues

1. Check file size limits (default: 10MB)
2. Verify allowed file types (.xlsx, .xls)
3. Check disk space on upload directory

## Future Enhancements

1. **Redis Cache**: Add Redis for session management and caching
2. **Message Queue**: Use RabbitMQ for async processing
3. **Database**: Add PostgreSQL for persistent storage
4. **API Gateway**: Implement API gateway for better routing
5. **Service Mesh**: Consider Istio for advanced traffic management

## References

- [IBM Code Engine Documentation](https://cloud.ibm.com/docs/codeengine)
- [OpenShift Documentation](https://docs.openshift.com/)
- [IBM WatsonX.ai Documentation](https://www.ibm.com/docs/en/watsonx-as-a-service)
- [Carbon Design System](https://carbondesignsystem.com/)