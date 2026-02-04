# Startup Troubleshooting Guide

## Common Issue: "ERR_SSL_PROTOCOL_ERROR" or "ECONNREFUSED ::1:3000"

### Problem
You're seeing errors like:
```
http proxy error: /api/user
Error: connect ECONNREFUSED ::1:3000
```

### Root Cause
The **backend server is not running**. You're only running the frontend (Vite) on port 5173, but the backend API on port 3000 is not started.

### Solution

**STOP** running `npm run dev` and instead use:

```bash
npm run dev:all
```

This command starts **BOTH** services:
- ✅ Frontend (Vite) on http://localhost:5173
- ✅ Backend (Express) on http://localhost:3000

## Step-by-Step Fix

### 1. Stop Current Process
Press `Ctrl+C` in your terminal to stop the current `npm run dev` process.

### 2. Start Both Services
```bash
cd excel-ai-processor
npm run dev:all
```

### 3. Verify Both Are Running
You should see output like:
```
[0] 
[0]   VITE v5.4.21  ready in 138 ms
[0] 
[0]   ➜  Local:   http://localhost:5173/
[1] 
[1] Excel AI Processor API running on port 3000
[1] Instana monitoring enabled
```

### 4. Test the Application
Open http://localhost:5173 in your browser. The app should now work without errors.

## Alternative: Run Services Separately

If you prefer to run services in separate terminals:

### Terminal 1 - Backend
```bash
cd excel-ai-processor
npm run server
```

### Terminal 2 - Frontend
```bash
cd excel-ai-processor
npm run dev
```

## Understanding the Commands

| Command | What It Does |
|---------|--------------|
| `npm run dev` | ❌ Frontend ONLY (causes the error) |
| `npm run server` | ❌ Backend ONLY (no UI) |
| `npm run dev:all` | ✅ BOTH frontend AND backend |

## Verifying Backend is Running

### Check Backend Health
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-02-04T18:15:00.000Z"
}
```

### Check Backend Logs
Look for this in your terminal:
```
Excel AI Processor API running on port 3000
Instana monitoring enabled
```

## Still Having Issues?

### Issue: Port 3000 Already in Use
```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 npm run server
```

### Issue: Port 5173 Already in Use
```bash
# Find what's using port 5173
lsof -i :5173

# Kill the process
kill -9 <PID>
```

### Issue: Missing Dependencies
```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Environment Variables Not Set
```bash
# Make sure .env file exists
ls -la .env

# If not, copy from example
cp .env.example .env

# Edit and add your credentials
nano .env
```

## Quick Reference

### ✅ Correct Startup
```bash
# ONE command to rule them all
npm run dev:all
```

### ❌ Wrong Startup (causes errors)
```bash
# Don't do this - frontend only!
npm run dev
```

## Production Deployment

For production, you don't need `dev:all`. The built app is served by the backend:

```bash
# Build frontend
npm run build

# Start backend (serves built frontend)
npm run server
```

## Need More Help?

1. Check [QUICK_START.md](./QUICK_START.md) for initial setup
2. Review [README.md](./README.md) for full documentation
3. See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment

## Summary

**Remember**: Always use `npm run dev:all` for local development! 🚀