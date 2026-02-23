# Deployment Fix - "Not Found" Error Resolution

## Problem Identified

The application was returning "Not Found" errors after deployment to Dinero because of a path mismatch between the Dockerfile and server.js:

**Error:**
```
Error: ENOENT: no such file or directory, stat '/app/dist/index.html'
```

## Root Cause

1. **Dockerfile (line 48)**: Was copying built frontend files to `/app/web/dist`
2. **server.js**: Was looking for files in `/app/dist` (production) or `../dist` (development)
3. **Result**: The server couldn't find the frontend files, causing 404 errors

## Changes Made

### 1. Dockerfile Update
**File:** `Dockerfile` (line 48)

**Before:**
```dockerfile
# Copy frontend build from builder to /app/web/dist (Golden Path structure)
COPY --from=frontend-builder /build/dist ./web/dist
```

**After:**
```dockerfile
# Copy frontend build from builder to /app/dist (matching server.js expectations)
COPY --from=frontend-builder /build/dist ./dist
```

### 2. server.js Updates
**File:** `api/server.js`

**Static Files Middleware (lines 41-45):**
```javascript
// Serve static files from the React app build
const frontendPath = process.env.NODE_ENV === 'production'
  ? '/app/dist'
  : path.join(__dirname, '../dist');
app.use(express.static(frontendPath));
```

**SPA Fallback Route (lines 1122-1124):**
```javascript
const indexPath = process.env.NODE_ENV === 'production'
  ? '/app/dist/index.html'
  : path.join(__dirname, '../dist/index.html');
res.sendFile(indexPath);
```

## Deployment Instructions

To apply this fix, you need to rebuild and redeploy:

### Option 1: Using Dinero CLI
```bash
cd excel-ai-processor

# Rebuild the Docker image
docker build -t excel-ai-processor:latest .

# Push to your registry (if using one)
# docker push your-registry/excel-ai-processor:latest

# Redeploy to Dinero
dinero deploy
```

### Option 2: Using Golden Path
```bash
cd excel-ai-processor

# Commit the changes
git add Dockerfile api/server.js
git commit -m "fix: correct frontend file paths for production deployment"

# Push to trigger automatic deployment
git push origin main
```

### Option 3: Manual Docker Commands
```bash
cd excel-ai-processor

# Build the image
docker build -t excel-ai-processor:latest .

# Test locally first (optional)
docker run -p 3000:3000 --env-file .env excel-ai-processor:latest

# If test passes, deploy to Dinero
dinero deploy
```

## Verification Steps

After redeployment, verify the fix:

1. **Check Application Loads:**
   - Navigate to your app URL
   - You should see the React frontend instead of "Not Found"

2. **Check Logs:**
   - The `ENOENT: no such file or directory, stat '/app/dist/index.html'` error should be gone
   - You should see: `🌐 Serving frontend from /dist`

3. **Test API Endpoints:**
   - API routes should still work: `/api/health`, `/api/upload`, etc.

4. **Test Frontend Routes:**
   - Navigate to different pages in the app
   - All routes should load correctly

## About Instana Warnings

The Instana warnings you're seeing are **NOT blocking** and are expected in certain environments:

```
The Instana host agent can neither be reached via 127.0.0.1:42699...
```

**Why this happens:**
- Instana agent tries to connect to a local host agent
- In containerized environments without the Instana agent installed, this is normal
- The app will continue to retry but function normally

**To resolve (optional):**
1. Install Instana agent in your Dinero environment
2. Or disable Instana in production if not needed:
   ```javascript
   // In api/instana.js, add environment check
   if (process.env.DISABLE_INSTANA === 'true') {
     // Skip Instana initialization
   }
   ```

## Summary

✅ **Fixed:** Frontend file path mismatch  
✅ **Updated:** Dockerfile to copy to `/app/dist`  
✅ **Updated:** server.js to read from `/app/dist` in production  
⚠️ **Note:** Instana warnings are non-blocking and can be ignored or resolved separately

## Next Steps

1. Rebuild and redeploy using one of the methods above
2. Verify the application loads correctly
3. (Optional) Address Instana warnings if monitoring is required

---
**Made with Bob**