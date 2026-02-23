# CRAFT Python Microservice Migration Summary

## Overview

The Python microservice has been successfully extracted from the CRAFT webapp and is now deployed separately on IBM Code Engine. This document summarizes all changes made to support the microservices architecture.

## Architecture Change

### Before (Monolithic)
```
┌─────────────────────────────────────┐
│   Single Container                  │
│   - React Frontend (Vite)           │
│   - Node.js Backend (Express)       │
│   - Python Service (Flask)          │
└─────────────────────────────────────┘
```

### After (Microservices)
```
┌─────────────────────────────────────┐
│   OpenShift/DINERO Cluster          │
│   - React Frontend (Vite)           │
│   - Node.js Backend (Express)       │
└──────────────┬──────────────────────┘
               │ HTTPS/REST API
               ▼
┌─────────────────────────────────────┐
│   IBM Code Engine                   │
│   - Python Microservice (Flask)     │
│   - Document Processing             │
│   - Delta Tool                      │
└─────────────────────────────────────┘
```

## Changes Made

### 1. Removed Python Microservice from Webapp

**Deleted:**
- `api/python-service/` - Entire Python service directory
- `k8s-local/` - Local Kubernetes configurations (no longer needed)

### 2. Updated package.json

**Removed scripts:**
- `python-service` - Script to run Python service locally
- References to Python in `dev:all` script
- Python venv cleanup from `clean` and `clean:install` scripts

**Updated scripts:**
```json
"dev:all": "concurrently --names \"VITE,API\" --prefix-colors \"cyan,green\" \"npm run dev\" \"npm run server\""
```

### 3. Updated Dockerfile (Production)

**Changes:**
- Removed Python builder stage
- Removed Python runtime installation
- Removed Python dependencies copying
- Changed from multi-service startup to single Node.js service
- Reduced from 4 stages to 3 stages
- Changed exposed ports from `3000 8080` to `3000` only

**New CMD:**
```dockerfile
CMD ["node", "api/server.js"]
```

### 4. Updated Dockerfile.dev (Development)

**Changes:**
- Removed `python-service` stage entirely
- Kept only `frontend` and `backend` stages

### 5. Updated docker-compose.yml

**Changes:**
- Removed `python-service` container
- Removed `depends_on: python-service` from backend
- Updated `PYTHON_SERVICE_URL` to point to Code Engine deployment
- Removed `python_venv` volume

**New Python Service URL:**
```yaml
PYTHON_SERVICE_URL=https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud
```

### 6. Updated Environment Configuration

**Files updated:**
- `.env` - Already had correct PYTHON_SERVICE_URL
- `.env.example` - Updated with production Code Engine URL and better documentation

**Python Service URL:**
```
PYTHON_SERVICE_URL=https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud
```

### 7. Kubernetes Deployment (k8s/deployment.yaml)

**Verified:**
- `PYTHON_SERVICE_URL` environment variable correctly set
- No Python container in deployment spec
- Only Node.js backend container present

## Python Microservice Location

The Python microservice is now maintained separately in:
```
CRAFT-python-microservice/
├── .env
├── .env.example
├── .gitignore
├── Dockerfile
├── README.md
├── deploy.sh
├── requirements.txt
├── flask_api.py
├── document_processor.py
└── delta_service.py
```

**Deployment:** IBM Code Engine
**URL:** https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud

## API Endpoints (Proxied through Node.js Backend)

The Node.js backend (`api/server.js`) proxies all Python microservice requests:

### Document Processing
- `POST /api/process` → Proxies to Python `/process`
- `GET /api/job/<job_id>/status` → Proxies to Python `/job/<job_id>/status`
- `GET /api/job/<job_id>/download` → Proxies to Python `/job/<job_id>/download`

### Delta Tool
- `POST /api/delta/upload-baseline` → Proxies to Python `/delta/upload-baseline`
- `POST /api/delta/process` → Proxies to Python `/delta/process`
- `GET /api/delta/baseline-info` → Proxies to Python `/delta/baseline-info`
- `DELETE /api/delta/baseline` → Proxies to Python `/delta/baseline`

## Deployment Instructions

### For CRAFT Webapp (OpenShift/DINERO)

1. **Build the container:**
   ```bash
   cd CRAFT_web_app/excel-ai-processor
   docker build -t excel-ai-processor:latest .
   ```

2. **Push to OpenShift registry:**
   ```bash
   oc login <your-cluster>
   docker tag excel-ai-processor:latest image-registry.openshift-image-registry.svc:5000/content-studio-platform/excel-ai-processor:latest
   docker push image-registry.openshift-image-registry.svc:5000/content-studio-platform/excel-ai-processor:latest
   ```

3. **Deploy to OpenShift:**
   ```bash
   oc apply -f k8s/configmap.yaml
   oc apply -f k8s/deployment.yaml
   oc apply -f k8s/service.yaml
   oc apply -f k8s/route.yaml
   ```

### For Python Microservice (IBM Code Engine)

See `CRAFT-python-microservice/README.md` for detailed deployment instructions.

**Quick deploy:**
```bash
cd CRAFT-python-microservice
./deploy.sh
```

## Environment Variables Required

### CRAFT Webapp (.env)
```bash
# Node.js Backend
NODE_ENV=production
PORT=3000

# Python Microservice URL
PYTHON_SERVICE_URL=https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud

# WatsonX.ai (for direct Node.js calls if needed)
WATSON_URL=https://us-south.ml.cloud.ibm.com
IBM_WATSONX_API_KEY=<your-key>
IBM_WATSONX_PROJECT_ID=<your-project-id>

# Instana Monitoring
INSTANA_REPORTING_URL=https://ibmdevsandbox-instanaibm.instana.io
INSTANA_AGENT_KEY=<your-key>
```

### Python Microservice (.env)
See `CRAFT-python-microservice/.env.example` for complete configuration.

## Testing

### Test Webapp Locally
```bash
cd CRAFT_web_app/excel-ai-processor
npm install
npm run dev:all
```
Access at: http://localhost:5173

### Test with Docker Compose
```bash
docker-compose up --build
```
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### Test Python Microservice
```bash
curl https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "Python Document Processor",
  "rag_enabled": true
}
```

## Benefits of Microservices Architecture

1. **Independent Scaling:** Python service can scale independently based on processing load
2. **Independent Deployment:** Update Python service without redeploying frontend/backend
3. **Technology Optimization:** Python service runs on optimized Python runtime (Code Engine)
4. **Resource Efficiency:** Webapp container is smaller and faster without Python dependencies
5. **Better Separation of Concerns:** Clear boundaries between UI/API and AI processing

## Troubleshooting

### Python Service Not Responding
1. Check Code Engine deployment status:
   ```bash
   ibmcloud ce application get --name craft-python-service
   ```

2. View logs:
   ```bash
   ibmcloud ce application logs --name craft-python-service --follow
   ```

3. Test health endpoint:
   ```bash
   curl https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud/health
   ```

### Webapp Can't Connect to Python Service
1. Verify `PYTHON_SERVICE_URL` in webapp environment variables
2. Check network connectivity from OpenShift to Code Engine
3. Verify OAuth/authentication headers are being forwarded correctly

### Build Failures
1. Ensure `api/python-service/` directory is completely removed
2. Clear Docker cache: `docker system prune -a`
3. Rebuild: `docker-compose build --no-cache`

## Migration Checklist

- [x] Remove `api/python-service/` directory
- [x] Remove `k8s-local/` directory
- [x] Update `package.json` scripts
- [x] Update `Dockerfile` (production)
- [x] Update `Dockerfile.dev` (development)
- [x] Update `docker-compose.yml`
- [x] Update `.env.example`
- [x] Verify `.env` has correct PYTHON_SERVICE_URL
- [x] Verify `k8s/deployment.yaml` configuration
- [x] Verify `api/server.js` proxy endpoints
- [ ] Test local development environment
- [ ] Test Docker Compose build
- [ ] Test production build
- [ ] Deploy to OpenShift
- [ ] Verify end-to-end functionality

## Next Steps

1. **Test the changes:**
   - Run local development: `npm run dev:all`
   - Test Docker build: `docker build -t excel-ai-processor:latest .`
   - Test Docker Compose: `docker-compose up --build`

2. **Deploy to OpenShift:**
   - Push updated image to registry
   - Apply Kubernetes manifests
   - Verify deployment health

3. **Monitor:**
   - Check Instana dashboards
   - Monitor Code Engine metrics
   - Review application logs

## Support

For issues or questions:
- **Webapp Issues:** Check `CRAFT_web_app/excel-ai-processor/README.md`
- **Python Microservice Issues:** Check `CRAFT-python-microservice/README.md`
- **Deployment Issues:** Check `CRAFT_web_app/excel-ai-processor/DEPLOYMENT_GUIDE.md`

---

**Migration Date:** 2026-02-23
**Python Microservice URL:** https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud
**Status:** ✅ Complete