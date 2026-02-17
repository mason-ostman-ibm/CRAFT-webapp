# Getting Started - Excel AI Processor

**Complete guide for running the Excel AI Processor on your local machine.**

This guide assumes you're starting from scratch and will walk you through every step needed to get the application running.

---

## Table of Contents

1. [What You'll Need](#what-youll-need)
2. [Step-by-Step Setup](#step-by-step-setup)
3. [Getting Your API Credentials](#getting-your-api-credentials)
4. [Running the Application](#running-the-application)
5. [Using the Application](#using-the-application)
6. [Troubleshooting](#troubleshooting)
7. [What's Running Where](#whats-running-where)

---

## What You'll Need

### Required Software

Before starting, install these on your computer:

#### 1. Node.js (JavaScript Runtime)
- **Version**: 18 or higher
- **Download**: https://nodejs.org/
- **Why**: Runs the frontend (React) and backend (Express) servers
- **Check if installed**: Open terminal and run `node --version`

#### 2. Python (Programming Language)
- **Version**: 3.8 or higher
- **Download**: https://www.python.org/downloads/
- **Why**: Runs the AI document processing service
- **Check if installed**: Open terminal and run `python3 --version`

#### 3. Git (Version Control)
- **Download**: https://git-scm.com/downloads
- **Why**: To clone the repository
- **Check if installed**: Open terminal and run `git --version`

### Required Credentials

You'll need an IBM Cloud account with access to:

#### IBM WatsonX.ai
- **What it does**: Powers the AI that generates answers to questions
- **How to get it**:
  1. Go to https://cloud.ibm.com/
  2. Sign up or log in
  3. Navigate to WatsonX.ai
  4. Create a project
  5. Get your API key and Project ID

#### Optional: DataStax AstraDB
- **What it does**: Enables advanced RAG (Retrieval Augmented Generation) features
- **How to get it**:
  1. Go to https://astra.datastax.com/
  2. Sign up for free tier
  3. Create a database
  4. Get your API endpoint and token
- **Note**: The app works without this, but some features will be limited

---

## Step-by-Step Setup

### Step 1: Clone the Repository

Open your terminal and run:

```bash
# Navigate to where you want the project
cd ~/Documents  # or wherever you keep projects

# Clone the repository
git clone <repository-url>

# Enter the project directory
cd excel-ai-processor
```

### Step 2: Run the Automated Setup

We've created a script that does most of the work for you:

```bash
# Make the script executable (macOS/Linux)
chmod +x setup.sh

# Run the setup script
./setup.sh
```

**What this script does:**
- ✅ Checks if Node.js and Python are installed
- ✅ Installs all Node.js dependencies
- ✅ Creates a Python virtual environment
- ✅ Installs all Python dependencies
- ✅ Creates configuration files from templates
- ✅ Creates necessary directories

**If you're on Windows:**
The script might not work. Instead, run these commands manually:

```cmd
# Install Node.js dependencies
npm install

# Create Python virtual environment
cd api\python-service
python -m venv venv

# Activate virtual environment
venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Deactivate and return to root
deactivate
cd ..\..

# Copy environment files
copy .env.example .env
copy api\python-service\.env.example api\python-service\.env

# Create uploads directory
mkdir uploads
```

### Step 3: Configure Your Credentials

You need to add your API credentials to two files:

#### File 1: Root `.env` file

Open `.env` in your text editor and update these lines:

```env
# Replace these with your actual credentials
WATSONX_API_KEY=your_actual_watsonx_api_key_here
WATSONX_PROJECT_ID=your_actual_watsonx_project_id_here

# Optional: Add AstraDB credentials if you have them
ASTRA_DB_API_ENDPOINT=your_astra_endpoint_here
ASTRA_DB_APPLICATION_TOKEN=your_astra_token_here
```

#### File 2: Python Service `.env` file

Open `api/python-service/.env` and add the **same credentials**:

```env
WATSONX_API_KEY=your_actual_watsonx_api_key_here
WATSONX_PROJECT_ID=your_actual_watsonx_project_id_here

# Optional: Same AstraDB credentials
ASTRA_DB_API_ENDPOINT=your_astra_endpoint_here
ASTRA_DB_APPLICATION_TOKEN=your_astra_token_here
```

**Important**: Both files need the same WatsonX credentials!

---

## Getting Your API Credentials

### IBM WatsonX.ai Credentials

#### Step 1: Log into IBM Cloud
1. Go to https://cloud.ibm.com/
2. Sign in with your IBM ID (or create one)

#### Step 2: Access WatsonX.ai
1. From the IBM Cloud dashboard, search for "WatsonX"
2. Click on "WatsonX.ai"
3. Click "Launch WatsonX.ai"

#### Step 3: Create a Project
1. Click "Projects" in the left sidebar
2. Click "New project"
3. Give it a name (e.g., "Excel AI Processor")
4. Click "Create"

#### Step 4: Get Your Project ID
1. Open your project
2. Click the "Manage" tab
3. Look for "Project ID" - copy this value
4. This is your `WATSONX_PROJECT_ID`

#### Step 5: Get Your API Key
1. Click your profile icon (top right)
2. Go to "Profile and settings"
3. Click "API keys" in the left menu
4. Click "Create +"
5. Give it a name (e.g., "Excel AI Processor Key")
6. Click "Create"
7. **IMPORTANT**: Copy the API key immediately - you can't see it again!
8. This is your `WATSONX_API_KEY`

### Optional: AstraDB Credentials

#### Step 1: Sign Up
1. Go to https://astra.datastax.com/
2. Sign up for a free account

#### Step 2: Create a Database
1. Click "Create Database"
2. Choose "Serverless (Vector)"
3. Give it a name
4. Select a region close to you
5. Click "Create Database"

#### Step 3: Get Your Credentials
1. Once created, click on your database
2. Click "Connect" tab
3. Copy the "API Endpoint" - this is your `ASTRA_DB_API_ENDPOINT`
4. Click "Generate Token"
5. Copy the token - this is your `ASTRA_DB_APPLICATION_TOKEN`

---

## Running the Application

### Option 1: Run Everything at Once (Recommended)

This is the easiest way - one command starts all three services:

```bash
npm run dev:all
```

You should see output like this:

```
[VITE] VITE v5.4.21 ready in 234 ms
[API] Excel AI Processor API Server running on port 3000
[PYTHON] Starting Python Document Processor API on port 5000
```

**What's running:**
- 🎨 **Frontend** (React/Vite): http://localhost:5173
- 🔧 **Backend API** (Express): http://localhost:3000
- 🐍 **Python Service** (Flask): http://localhost:5000

### Option 2: Run Services Separately

If you want more control or need to debug, run each service in its own terminal:

**Terminal 1 - Backend API:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

**Terminal 3 - Python Service:**
```bash
npm run python-service
```

### Verify Everything is Running

Open your browser and check:

1. **Frontend**: http://localhost:5173
   - You should see the Excel AI Processor homepage

2. **Backend Health**: http://localhost:3000/api/health
   - You should see: `{"status":"ok","message":"Excel AI Processor API Server is running"}`

3. **Python Service Health**: http://localhost:5000/health
   - You should see: `{"status":"ok","service":"Python Document Processor"}`

---

## Using the Application

### Basic Workflow

1. **Open the App**
   - Go to http://localhost:5173 in your browser

2. **Upload an Excel File**
   - Click "Process Files" in the navigation
   - Click "Upload Excel File" or drag and drop
   - Supported formats: `.xlsx`, `.xls`

3. **Add Context (Optional)**
   - Provide background information to help the AI
   - Example: "This is for a financial services company"

4. **Process with AI**
   - Click "Process with AI"
   - The AI will analyze questions and generate answers
   - This may take a few minutes depending on file size

5. **Review Results**
   - Go to "Validation" page
   - Review the generated answers
   - Check completion statistics

6. **Download**
   - Click "Download Completed File"
   - Your Excel file now has AI-generated answers!

### Example Excel File Format

Your Excel file should have:
- **Column A**: Questions
- **Column B**: Answers (can be empty - AI will fill these)

Example:
```
| Question                          | Answer |
|-----------------------------------|--------|
| What is your company's mission?   |        |
| How many employees do you have?   |        |
| What are your main products?      |        |
```

---

## Troubleshooting

### Problem: "Cannot connect to backend"

**Symptoms**: Frontend loads but shows connection errors

**Solution**:
1. Make sure you ran `npm run dev:all` (not just `npm run dev`)
2. Check that backend is running on port 3000
3. Check terminal for error messages

### Problem: "Python service not responding"

**Symptoms**: File upload works but processing fails

**Solution**:
1. Check Python service is running: http://localhost:5000/health
2. Verify Python virtual environment is activated
3. Check `api/python-service/.env` has correct credentials
4. Look at Python service terminal for errors

### Problem: "Authentication failed" or "401 Unauthorized"

**Symptoms**: Processing fails with authentication error

**Solution**:
1. Verify your WatsonX API key is correct in both `.env` files
2. Check your API key hasn't expired
3. Ensure your IBM Cloud account has WatsonX.ai access
4. Try regenerating your API key

### Problem: "Port already in use"

**Symptoms**: Error like "EADDRINUSE: address already in use :::3000"

**Solution**:

**macOS/Linux:**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or for port 5000
lsof -ti:5000 | xargs kill -9

# Or for port 5173
lsof -ti:5173 | xargs kill -9
```

**Windows:**
```cmd
# Find process on port 3000
netstat -ano | findstr :3000

# Kill it (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Problem: "Module not found" errors

**Symptoms**: Import errors when starting services

**Solution**:
```bash
# Clean and reinstall everything
npm run clean:install
```

### Problem: Python dependencies won't install

**Symptoms**: Errors during `pip install`

**Solution**:

**macOS:**
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install python3-dev build-essential
```

**Windows:**
- Install Visual C++ Build Tools from:
  https://visualstudio.microsoft.com/visual-cpp-build-tools/

### Problem: Setup script won't run

**Symptoms**: `./setup.sh: Permission denied`

**Solution**:
```bash
# Make it executable
chmod +x setup.sh

# Then run it
./setup.sh
```

### Still Having Issues?

1. Check the detailed [SETUP.md](./SETUP.md) guide
2. Review [STARTUP_TROUBLESHOOTING.md](./STARTUP_TROUBLESHOOTING.md)
3. Look at terminal output for specific error messages
4. Ensure all environment variables are set correctly

---

## What's Running Where

When you run `npm run dev:all`, three services start:

### Frontend (Port 5173)
- **Technology**: React + Vite
- **URL**: http://localhost:5173
- **Purpose**: User interface
- **Files**: `src/` directory
- **Hot Reload**: Yes - changes appear immediately

### Backend API (Port 3000)
- **Technology**: Node.js + Express
- **URL**: http://localhost:3000
- **Purpose**: Main API server, file handling, WatsonX integration
- **Files**: `api/server.js`
- **Serves**: Built frontend in production

### Python Service (Port 5000)
- **Technology**: Python + Flask
- **URL**: http://localhost:5000
- **Purpose**: Document processing, RAG features, Delta tool
- **Files**: `api/python-service/`
- **Used by**: Backend API for advanced processing

### How They Work Together

```
User Browser (5173)
    ↓
Frontend (React)
    ↓ API calls
Backend (3000)
    ↓ Processing requests
Python Service (5000)
    ↓ AI calls
WatsonX.ai
```

---

## Next Steps

Once you have the app running:

1. **Try the Demo**
   - Upload a sample Excel file
   - Test the AI processing
   - Review the results

2. **Explore Features**
   - Try the Delta Tool (if you have AstraDB)
   - Test the validation page
   - Check the team page

3. **Customize**
   - Modify the AI prompts in `api/server.js`
   - Adjust the UI in `src/` files
   - Configure settings in `.env`

4. **Deploy**
   - See [DEPLOYMENT.md](./DEPLOYMENT.md) for OpenShift deployment
   - Or use Docker: `npm run docker:prod:build`

---

## Quick Reference

### Common Commands

```bash
# Start everything
npm run dev:all

# Start services separately
npm run dev          # Frontend only
npm run server       # Backend only
npm run python-service  # Python service only

# Build for production
npm run build

# Run with Docker
npm run docker:dev:build

# Clean and reinstall
npm run clean:install

# Run tests
npm test
```

### Important Files

- `.env` - Main configuration
- `api/python-service/.env` - Python service configuration
- `package.json` - Node.js dependencies and scripts
- `api/python-service/requirements.txt` - Python dependencies

### Important URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Python Service: http://localhost:5000
- Backend Health: http://localhost:3000/api/health
- Python Health: http://localhost:5000/health

---

## Getting Help

If you're stuck:

1. **Check the logs** in your terminal for error messages
2. **Verify credentials** in both `.env` files
3. **Review documentation**:
   - [SETUP.md](./SETUP.md) - Detailed setup
   - [README.md](./README.md) - Project overview
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide
4. **Common issues** are covered in [STARTUP_TROUBLESHOOTING.md](./STARTUP_TROUBLESHOOTING.md)

---

**You're all set! 🎉**

Open http://localhost:5173 and start processing Excel files with AI!