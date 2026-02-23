# CRAFT Developer Guide

**Complete guide for developing and deploying the CRAFT application.**

This guide covers everything from local development setup to production deployment with the microservices architecture.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Local Development Setup](#local-development-setup)
3. [Getting API Credentials](#getting-api-credentials)
4. [Running Locally](#running-locally)
5. [Development Workflow](#development-workflow)
6. [Deployment Guide](#deployment-guide)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

CRAFT uses a **microservices architecture** with two separate deployments:

```
┌─────────────────────────────────────┐
│   OpenShift/DINERO Cluster          │
│   - React Frontend (Port 5173)      │
│   - Node.js Backend (Port 3000)     │
└──────────────┬──────────────────────┘
               │ HTTPS/REST API
               ▼
┌─────────────────────────────────────┐
│   IBM Code Engine                   │
│   - Python Microservice (Port 8080) │
│   - Document Processing             │
│   - Delta Tool                      │
└─────────────────────────────────────┘
```

**Why separate deployments?**
- OpenShift cron job doesn't support Python
- Independent scaling of AI processing
- Smaller frontend/backend container
- Clear separation of concerns

---

## Local Development Setup

### Prerequisites

Install these on your computer:

#### 1. Node.js (JavaScript Runtime)
- **Version**: 18 or higher
- **Download**: https://nodejs.org/
- **Check**: `node --version`

#### 2. Git (Version Control)
- **Download**: https://git-scm.com/downloads
- **Check**: `git --version`

#### 3. IBM Cloud Account
- **Required**: WatsonX.ai access
- **Sign up**: https://cloud.ibm.com/

#### 4. Optional: Python (for local microservice testing)
- **Version**: 3.8 or higher
- **Download**: https://www.python.org/downloads/
- **Note**: Not required if using deployed Code Engine service

### Quick Setup

```bash
# 1. Clone the repository
git clone <repository-url>
cd excel-ai-processor

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 4. Start development
npm run dev:all
```

### Detailed Setup Steps

#### Step 1: Clone Repository

```bash
cd ~/Documents  # or your preferred location
git clone <repository-url>
cd excel-ai-processor
```

#### Step 2: Install Dependencies

```bash
npm install
```

#### Step 3: Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# Node.js Backend
NODE_ENV=development
PORT=3000

# Python Microservice URL (use deployed Code Engine service)
PYTHON_SERVICE_URL=https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud

# Optional: WatsonX credentials (for direct Node.js calls if needed)
IBM_WATSONX_API_KEY=your_api_key_here
IBM_WATSONX_PROJECT_ID=your_project_id_here

# Optional: Instana monitoring
INSTANA_REPORTING_URL=https://ibmdevsandbox-instanaibm.instana.io
INSTANA_AGENT_KEY=your_instana_key_here
```

---

## Getting API Credentials

### IBM WatsonX.ai Credentials

#### Step 1: Access IBM Cloud
1. Go to https://cloud.ibm.com/
2. Sign in with your IBM ID

#### Step 2: Create WatsonX Project
1. Search for "WatsonX" in the dashboard
2. Click "WatsonX.ai" → "Launch WatsonX.ai"
3. Click "Projects" → "New project"
4. Name it (e.g., "CRAFT Application")
5. Click "Create"

#### Step 3: Get Project ID
1. Open your project
2. Click "Manage" tab
3. Copy the "Project ID"
4. This is your `IBM_WATSONX_PROJECT_ID`

#### Step 4: Get API Key
1. Click profile icon (top right)
2. Go to "Profile and settings"
3. Click "API keys" → "Create +"
4. Name it (e.g., "CRAFT Key")
5. **Copy immediately** - you can't see it again!
6. This is your `IBM_WATSONX_API_KEY`

### Optional: AstraDB Credentials

Only needed for Delta Tool and RAG features:

1. Go to https://astra.datastax.com/
2. Sign up for free tier
3. Create a "Serverless (Vector)" database
4. Get API Endpoint and Application Token

---

## Running Locally

### Option 1: Use Deployed Python Service (Recommended)

This is the easiest way - connects to the deployed Code Engine service:

```bash
npm run dev:all
```

**What's running:**
- ✅ Frontend: http://localhost:5173
- ✅ Backend: http://localhost:3000
- ✅ Python Service: Uses Code Engine URL (no local setup needed)

### Option 2: Run Python Service Locally

Only if you need to test Python service changes:

**Terminal 1 - Python Service:**
```bash
cd ../../CRAFT-python-microservice
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python flask_api.py
```

**Terminal 2 - Frontend & Backend:**
```bash
cd CRAFT_web_app/excel-ai-processor
# Update .env: PYTHON_SERVICE_URL=http://localhost:8080
npm run dev:all
```

### Verify Everything Works

Open your browser:

1. **Frontend**: http://localhost:5173
   - Should show CRAFT homepage

2. **Backend Health**: http://localhost:3000/api/health
   - Should return: `{"status":"ok"}`

3. **Python Service**: Check configured URL
   - Code Engine: https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud/health
   - Local: http://localhost:8080/health

---

## Tools & Features

CRAFT provides several specialized tools for questionnaire processing and management. Each tool serves a specific purpose in the workflow.

### 1. AI Processor Tool

**Location**: Process Page (`/process`)

**Purpose**: Automatically generate professional answers for Excel questionnaires using IBM WatsonX.ai with RAG (Retrieval-Augmented Generation).

**How It Works**:
1. **Upload**: User uploads Excel file (.xlsx, .xls) with questions
2. **Smart Column Detection**: Python microservice uses LLM to automatically identify question/answer columns
3. **RAG Processing**: For each unanswered question:
   - Generates embedding using IBM Granite model
   - Searches AstraDB for top 5 similar Q&A pairs (similarity > 0.5)
   - Constructs prompt with relevant context examples
   - Calls WatsonX.ai to generate contextual answer
4. **Multi-Sheet Support**: Processes multiple sheets, automatically skips instruction/legend sheets
5. **Direct Download**: Returns completed Excel file with all answers filled

**Key Features**:
- **Context Input**: Optional context field to guide AI generation (e.g., "Q4 2024 executive review")
- **Smart Detection**: Works with any Excel layout - no hardcoded column names required
- **RAG Enhancement**: Uses historical Q&A data from AstraDB for better answer quality
- **Progress Tracking**: Real-time status updates during processing
- **Q&A Preview**: Shows all AI-generated answers before download
- **Error Recovery**: Continues processing even if individual questions fail

**Use Cases**:
- New questionnaires with no historical data
- Questions requiring fresh, contextual answers
- Complex questionnaires with multiple sheets
- When you need AI to generate original content

**Technical Details**:
- Backend: Node.js proxies to Python microservice
- Python Service: Flask API with WatsonX.ai SDK
- Model: Mistral Small 3.1 24B Instruct (configurable)
- Vector DB: AstraDB with IBM Granite embeddings
- Processing Time: 1-5 seconds per question

---

### 2. Delta Tool

**Location**: Delta Page (`/delta`)

**Purpose**: Intelligently reuse answers from previous year questionnaires using AI-powered semantic matching. Dramatically reduces manual effort for recurring questionnaires.

**How It Works**:

**Phase 1 - Upload Baseline**:
1. Upload completed questionnaire from previous year (e.g., 2024 Security Questionnaire)
2. Python service extracts all Q&A pairs
3. Generates vector embeddings for each question using IBM Granite model
4. Stores in AstraDB collection `delta_baseline_{year}`

**Phase 2 - Process Current Year**:
1. Upload current year questionnaire (can have blank answers)
2. For each question in current file:
   - Generate embedding
   - Query AstraDB for top 3 similar questions from baseline
   - Calculate similarity score (0-1)
   - Apply three-tier confidence logic:
     - **HIGH (≥0.90)**: Auto-populate immediately
     - **MEDIUM (0.85-0.89)**: Verify with LLM, then populate
     - **LOW (<0.85)**: Leave blank (new question)
3. Return Excel file with matched answers filled in

**Two Processing Modes**:

1. **Copy/Paste Mode** (Default):
   - Directly copies matching answers from baseline
   - Faster processing
   - Exact answer preservation
   - Best for: Identical or near-identical questions

2. **LLM Generation Mode**:
   - Uses baseline answers as reference context
   - LLM generates new answer based on context
   - More adaptive to question variations
   - Best for: Similar but not identical questions

**Key Features**:
- **Three-Tier Confidence System**: HIGH/MEDIUM/LOW with different handling
- **LLM Verification**: Optional verification for medium-confidence matches
- **Complete Audit Trail**: Shows which answers were reused and why
- **Processing Summary**: Detailed statistics on matches, confidence levels, completion rate
- **Match Details**: View all matched questions with similarity scores
- **Unmatched Questions**: See questions that need manual attention
- **Baseline Management**: Upload, view, and replace baselines

**Use Cases**:
- Annual security questionnaires
- Recurring compliance assessments
- Vendor questionnaires with similar questions year-over-year
- When 80%+ of questions are similar to previous year
- Reducing time spent on repetitive questionnaires

**Typical Results**:
- **Completion Rate**: 80-95% auto-answered
- **Time Savings**: 50-80% reduction in completion time
- **Accuracy**: >95% precision on matched questions

**Technical Details**:
- Embedding Model: IBM Granite 30M English (384 dimensions)
- Similarity Threshold: 0.85 (configurable)
- Vector Search: AstraDB with cosine similarity
- LLM Verification: WatsonX.ai Mistral model
- Processing Time: 5-30 seconds depending on question count

**Workflow Integration**:
```
Option 1: Delta First, Then AI (Recommended)
1. Upload baseline (previous year)
2. Process current year with Delta Tool → 80% complete
3. Upload to AI Processor for remaining 20%
4. Download final completed file

Option 2: Standalone Delta Tool
1. Upload baseline
2. Process current year → 80% complete
3. Manually complete remaining 20%
4. Download
```

---

### 3. Validation Tool

**Location**: Validation Page (`/validate`)

**Status**: ⚠️ Currently not functional (placeholder)

**Intended Purpose**: Review and validate AI-generated answers before finalizing Excel files.

**Planned Features**:
- View all Q&A pairs in table format
- Flag invalid or incomplete answers
- Edit answers directly in interface
- Validation statistics (valid/invalid counts)
- Completion rate tracking
- Export validated results

**Current Workaround**: Download processed files directly from Process or Delta pages and review in Excel.

---

### 4. Team Page

**Location**: Team Page (`/team`)

**Purpose**: Display information about the CRAFT development team.

**Features**:
- Team member profiles
- Roles and titles
- Project leadership indicators
- Co-op student identification

---

## Tool Comparison Matrix

| Feature | AI Processor | Delta Tool | Validation Tool |
|---------|-------------|------------|-----------------|
| **Best For** | New questionnaires | Recurring questionnaires | Quality review |
| **Answer Source** | AI generation | Previous year reuse | Manual review |
| **Processing Time** | 1-5 sec/question | 5-30 sec total | N/A |
| **Requires Baseline** | No | Yes | No |
| **RAG Enhancement** | Yes | Optional (LLM mode) | N/A |
| **Typical Completion** | 100% | 80-95% | N/A |
| **Manual Effort** | None | 5-20% | 100% |
| **Status** | ✅ Functional | ✅ Functional | ⚠️ Placeholder |

---

## Choosing the Right Tool

### Use AI Processor When:
- ✅ First-time questionnaire (no historical data)
- ✅ Questions require fresh, contextual answers
- ✅ Need AI to generate original content
- ✅ Have good context to guide AI
- ✅ Questions are unique or complex

### Use Delta Tool When:
- ✅ Annual/recurring questionnaire
- ✅ 80%+ questions similar to previous year
- ✅ Want to preserve exact historical answers
- ✅ Need fast turnaround
- ✅ Have completed baseline from previous year
- ✅ Want audit trail of answer reuse

### Use Both (Recommended Workflow):
1. **Delta Tool First**: Auto-answer 80-95% using baseline
2. **AI Processor Second**: Complete remaining questions with AI
3. **Result**: 100% completion with minimal manual effort

---

## Development Workflow

### Making Changes

#### Frontend Changes (Hot Reload)
```bash
# Edit files in src/
# Changes appear immediately in browser
```

#### Backend Changes (Restart Required)
```bash
# Edit api/server.js
# Press Ctrl+C and run: npm run server
```

#### Python Service Changes
```bash
# If running locally: Ctrl+C and restart
# If using Code Engine: Deploy changes (see deployment section)
```

### Testing

```bash
# Run tests
npm test

# Run with UI
npm run test:ui

# Generate coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint
```

### Building for Production

```bash
# Build frontend
npm run build

# Build Docker image
npm run docker:prod:build
```

---

## Deployment Guide

### Part 1: Deploy Python Microservice to Code Engine

#### Prerequisites
- IBM Cloud CLI installed
- Code Engine plugin: `ibmcloud plugin install code-engine`
- WatsonX.ai credentials

#### Automated Deployment (Recommended)

```bash
cd CRAFT-python-microservice
./deploy.sh
```

The script will:
- Login to IBM Cloud
- Create/select Code Engine project
- Create ConfigMap and Secrets
- Build and deploy application
- Output service URL

#### Manual Deployment

1. **Login to IBM Cloud**:
```bash
ibmcloud login
ibmcloud target -r us-south -g Default
```

2. **Create Code Engine project**:
```bash
ibmcloud ce project create --name craft-microservice
ibmcloud ce project select --name craft-microservice
```

3. **Create ConfigMap**:
```bash
ibmcloud ce configmap create --name craft-config \
  --from-literal WATSON_URL=https://us-south.ml.cloud.ibm.com \
  --from-literal WATSON_TEXT_MODEL=mistralai/mistral-small-3-1-24b-instruct-2503 \
  --from-literal FLASK_ENV=production
```

4. **Create Secret**:
```bash
ibmcloud ce secret create --name craft-secrets \
  --from-literal IBM_WATSONX_API_KEY=your_api_key \
  --from-literal IBM_WATSONX_PROJECT_ID=your_project_id
```

5. **Deploy application**:
```bash
ibmcloud ce application create \
  --name craft-python-service \
  --build-source . \
  --strategy dockerfile \
  --port 8080 \
  --min-scale 1 \
  --max-scale 5 \
  --cpu 1 \
  --memory 2G \
  --env-from-configmap craft-config \
  --env-from-secret craft-secrets \
  --wait
```

6. **Get service URL**:
```bash
ibmcloud ce application get --name craft-python-service --output url
```

#### Verify Python Service Deployment

```bash
# Check status
ibmcloud ce application get --name craft-python-service

# Test health endpoint
curl https://your-service-url.appdomain.cloud/health

# View logs
ibmcloud ce application logs --name craft-python-service --follow
```

### Part 2: Deploy Frontend/Backend to OpenShift

#### Prerequisites
- OpenShift CLI (oc) installed
- Access to OpenShift/DINERO cluster
- Container registry access

#### Step 1: Build Application

```bash
cd CRAFT_web_app/excel-ai-processor

# Install dependencies
npm install

# Build frontend
npm run build

# Build Docker image
docker build -t excel-ai-processor:latest .
```

#### Step 2: Configure OpenShift Resources

Update `k8s/configmap.yaml`:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: craft-config
data:
  NODE_ENV: "production"
  PORT: "3000"
  PYTHON_SERVICE_URL: "https://craft-python-service.appdomain.cloud"
  MAX_FILE_SIZE: "10485760"
  ALLOWED_FILE_TYPES: ".xlsx,.xls"
```

Create `k8s/secret.yaml`:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: craft-secrets
type: Opaque
stringData:
  INSTANA_AGENT_KEY: "your_instana_key"
  INSTANA_ENDPOINT_URL: "https://your-instana-endpoint.instana.io"
```

#### Step 3: Deploy to OpenShift

```bash
# Login to OpenShift
oc login --token=your-token --server=https://your-cluster.com

# Create/select project
oc new-project craft-app || oc project craft-app

# Apply configurations
oc apply -f k8s/configmap.yaml
oc apply -f k8s/secret.yaml
oc apply -f k8s/deployment.yaml
oc apply -f k8s/service.yaml
oc apply -f k8s/route.yaml

# Check deployment
oc get pods
oc get route
```

#### Step 4: Verify Frontend/Backend Deployment

```bash
# Get route URL
oc get route craft-app -o jsonpath='{.spec.host}'

# Test application
curl https://your-app-route.apps.cluster.com

# Check logs
oc logs -f deployment/craft-app
```

### Updating Deployments

#### Update Python Microservice

```bash
cd CRAFT-python-microservice

# Make changes, then:
ibmcloud ce application update \
  --name craft-python-service \
  --build-source .
```

#### Update Frontend/Backend

```bash
cd CRAFT_web_app/excel-ai-processor

# Build new version
npm run build
docker build -t your-registry/craft-app:v2 .
docker push your-registry/craft-app:v2

# Update deployment
oc set image deployment/craft-app craft-app=your-registry/craft-app:v2
```

### Scaling

#### Scale Python Microservice

```bash
ibmcloud ce application update \
  --name craft-python-service \
  --min-scale 2 \
  --max-scale 10
```

#### Scale Frontend/Backend

```bash
# Manual scaling
oc scale deployment/craft-app --replicas=5

# Auto-scaling
oc autoscale deployment/craft-app \
  --min=2 \
  --max=10 \
  --cpu-percent=70
```

---

## Troubleshooting

### Local Development Issues

#### Problem: "Cannot connect to backend"

**Solution**:
```bash
# Make sure you ran dev:all, not just dev
npm run dev:all

# Check backend is running
curl http://localhost:3000/api/health
```

#### Problem: "Python service not responding"

**Solution**:
```bash
# Check PYTHON_SERVICE_URL in .env
# Test the URL
curl https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud/health
```

#### Problem: "Port already in use"

**macOS/Linux**:
```bash
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

**Windows**:
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Deployment Issues

#### Python Microservice Not Responding

```bash
# Check status
ibmcloud ce application get --name craft-python-service

# View logs
ibmcloud ce application logs --name craft-python-service

# Test health
curl https://your-service-url.appdomain.cloud/health
```

#### Frontend/Backend Can't Connect to Python Service

1. Verify `PYTHON_SERVICE_URL` in ConfigMap
2. Check network connectivity
3. Test from pod: `oc exec <pod-name> -- curl https://python-service-url/health`

#### OpenShift Pods Not Starting

```bash
# Describe pod
oc describe pod <pod-name>

# Check logs
oc logs <pod-name>

# Check events
oc get events --sort-by='.lastTimestamp'
```

### Common Errors

#### "Authentication failed" (401)

**Solution**:
- Verify WatsonX API key is correct
- Check API key hasn't expired
- Ensure IBM Cloud account has WatsonX.ai access

#### "Module not found"

**Solution**:
```bash
npm run clean:install
```

---

## Quick Reference

### Common Commands

```bash
# Local Development
npm run dev:all          # Start everything
npm run dev              # Frontend only
npm run server           # Backend only
npm run build            # Build for production

# Testing
npm test                 # Run tests
npm run lint             # Lint code

# Docker
npm run docker:dev:build # Build dev containers
npm run docker:prod:build # Build prod image

# Cleanup
npm run clean:install    # Clean and reinstall
```

### Important URLs

**Local Development:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Backend Health: http://localhost:3000/api/health

**Production:**
- Python Service: https://craft-python-service.24t5y2wfmvmo.us-east.codeengine.appdomain.cloud
- Frontend/Backend: https://your-app-route.apps.cluster.com

### Important Files

- `.env` - Backend configuration
- `package.json` - Node.js dependencies
- `k8s/` - Kubernetes/OpenShift configs
- `Dockerfile` - Production container build

---

## Additional Resources

- **README.md** - Project overview
- **Python Microservice** - See `CRAFT-python-microservice/README.md`
- **IBM Code Engine** - https://cloud.ibm.com/docs/codeengine
- **OpenShift** - https://docs.openshift.com/
- **Carbon Design System** - https://carbondesignsystem.com/

---

**Happy developing! 🚀**

For questions or issues, check the logs first, then consult this guide.