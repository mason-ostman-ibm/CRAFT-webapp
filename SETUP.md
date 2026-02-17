# Setup Guide - Excel AI Processor

Complete setup guide for developers cloning and running the Excel AI Processor application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Running the Application](#running-the-application)
- [Docker Setup](#docker-setup)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

### Required
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm 9+** - Comes with Node.js
- **Python 3.8+** - [Download](https://www.python.org/)
- **pip3** - Comes with Python

### Optional (for Docker)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
- **Docker Compose** - Included with Docker Desktop

### Required Credentials
- **IBM WatsonX.ai API Key** - Get from [IBM Cloud](https://cloud.ibm.com/)
- **IBM WatsonX.ai Project ID** - From your WatsonX project
- **AstraDB Credentials** (Optional) - For RAG/Delta features from [DataStax Astra](https://astra.datastax.com/)

## Quick Start

The fastest way to get started:

```bash
# 1. Clone the repository
git clone <repository-url>
cd excel-ai-processor

# 2. Run the automated setup script
./setup.sh

# 3. Edit environment files with your credentials
nano .env
nano api/python-service/.env

# 4. Start all services
npm run dev:all
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Python Service: http://localhost:5000

## Detailed Setup

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd excel-ai-processor
```

### Step 2: Install Node.js Dependencies

```bash
npm install
```

This installs all frontend and backend Node.js dependencies.

### Step 3: Setup Python Environment

```bash
cd api/python-service

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Deactivate and return to root
deactivate
cd ../..
```

### Step 4: Configure Environment Variables

#### Root .env File

```bash
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# IBM WatsonX.ai
WATSONX_API_KEY=your_actual_api_key_here
WATSONX_PROJECT_ID=your_actual_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com

# AstraDB (Optional - for RAG/Delta features)
ASTRA_DB_API_ENDPOINT=your_astra_endpoint_here
ASTRA_DB_APPLICATION_TOKEN=your_astra_token_here

# Application
NODE_ENV=development
PORT=3000
PYTHON_SERVICE_PORT=5000
```

#### Python Service .env File

```bash
cp api/python-service/.env.example api/python-service/.env
```

Edit `api/python-service/.env` with the same credentials:

```env
WATSONX_API_KEY=your_actual_api_key_here
WATSONX_PROJECT_ID=your_actual_project_id_here
WATSONX_URL=https://us-south.ml.cloud.ibm.com

# Optional
ASTRA_DB_API_ENDPOINT=your_astra_endpoint_here
ASTRA_DB_APPLICATION_TOKEN=your_astra_token_here
```

### Step 5: Create Uploads Directory

```bash
mkdir -p uploads
```

## Running the Application

### Option 1: Run All Services Together (Recommended)

```bash
npm run dev:all
```

This starts:
- ✅ Frontend (Vite) on http://localhost:5173
- ✅ Backend API (Express) on http://localhost:3000
- ✅ Python Service (Flask) on http://localhost:5000

### Option 2: Run Services Separately

Useful for debugging individual services:

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run server

# Terminal 3 - Python Service
npm run python-service
```

### Option 3: Production Build

```bash
# Build frontend
npm run build

# Start backend (serves built frontend)
npm run server
```

## Docker Setup

### Development with Docker Compose

```bash
# Build and start all services
npm run docker:dev:build

# Or just start (if already built)
npm run docker:dev

# Stop services
npm run docker:dev:down
```

Services will be available at the same ports as local development.

### Production Docker Build

```bash
# Build production image
npm run docker:prod:build

# Run production container
npm run docker:prod:run
```

Or manually:

```bash
# Build
docker build -t excel-ai-processor:latest .

# Run
docker run -p 3000:3000 --env-file .env excel-ai-processor:latest
```

## Troubleshooting

### Common Issues

#### 1. "ECONNREFUSED" Error

**Problem**: Frontend can't connect to backend.

**Solution**: Make sure you're running `npm run dev:all` instead of just `npm run dev`.

#### 2. Python Virtual Environment Not Found

**Problem**: `npm run python-service` fails.

**Solution**:
```bash
cd api/python-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ../..
```

#### 3. Port Already in Use

**Problem**: Port 3000, 5000, or 5173 is already in use.

**Solution**:
```bash
# Find and kill process using port
# macOS/Linux:
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### 4. WatsonX.ai Authentication Error

**Problem**: API calls fail with 401 or 403.

**Solution**:
- Verify your API key is correct in both `.env` files
- Check your WatsonX project ID
- Ensure your IBM Cloud account has WatsonX.ai access

#### 5. Python Dependencies Installation Fails

**Problem**: `pip install` fails with compilation errors.

**Solution**:
```bash
# macOS - Install Xcode Command Line Tools
xcode-select --install

# Ubuntu/Debian
sudo apt-get install python3-dev build-essential

# Windows - Install Visual C++ Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

#### 6. Module Not Found Errors

**Problem**: Import errors in Python or Node.js.

**Solution**:
```bash
# Clean and reinstall everything
npm run clean:install
```

### Verification Steps

After setup, verify everything works:

```bash
# 1. Check Node.js version
node --version  # Should be 18+

# 2. Check Python version
python3 --version  # Should be 3.8+

# 3. Test backend health
curl http://localhost:3000/api/health

# 4. Test Python service health
curl http://localhost:5000/health

# 5. Open frontend
open http://localhost:5173
```

### Getting Help

If you're still having issues:

1. Check the [STARTUP_TROUBLESHOOTING.md](./STARTUP_TROUBLESHOOTING.md) guide
2. Review the [README.md](./README.md) for additional context
3. Check the logs in your terminal for specific error messages
4. Ensure all environment variables are set correctly

## Next Steps

Once setup is complete:

1. **Test the Application**: Upload a sample Excel file
2. **Review Documentation**: Read [README.md](./README.md) for features
3. **Explore the Code**: Check out the [ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md)
4. **Deploy**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for OpenShift deployment

## Development Workflow

### Making Changes

```bash
# Frontend changes - Hot reload enabled
# Edit files in src/ - changes appear immediately

# Backend changes - Restart required
# Edit api/server.js - Ctrl+C and restart

# Python service changes - Restart required
# Edit api/python-service/*.py - Ctrl+C and restart
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code (if configured)
npm run format
```

## Additional Resources

- [IBM Carbon Design System](https://carbondesignsystem.com/)
- [IBM WatsonX.ai Documentation](https://www.ibm.com/products/watsonx-ai)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [Flask Documentation](https://flask.palletsprojects.com/)