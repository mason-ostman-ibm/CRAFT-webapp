# Deployment Fix - "Not Found" Error Resolution

## Problem Identified

The application was returning "Not Found" errors after deployment to Dinero because the server.js was not respecting the Golden Path build system's environment variables.

**Error:**
```
Error: ENOENT: no such file or directory, stat '/app/dist/index.html'
```

## Root Cause

The **Golden Path build system** uses its own multi-stage Dockerfile that:
1. Sets `WEB_ROOT=/app/web/dist` environment variable
2. Copies frontend files to `/app/web/dist`
3. But server.js was hardcoded to look in `/app/dist`

From the build logs:
```
[3/3] STEP 3/10: ENV NODE_ENV=production WEB_ROOT=/app/web/dist
[3/3] STEP 4/10: COPY --from=webbuild /out/ /app/web/
```

## Solution

Updated `api/server.js` to respect the `WEB_ROOT` environment variable set by Golden Path:

### Changes Made

**File:** `api/server.js`

**Static Files Middleware (lines 41-44):**
```javascript
// Serve static files from the React app build
// Golden Path sets WEB_ROOT=/app/web/dist, local dev uses ../dist
const frontendPath = process.env.WEB_ROOT || path.join(__dirname, '../dist');
app.use(express.static(frontendPath));
```

**SPA Fallback Route (lines 1122-1126):**
```javascript
// Golden Path sets WEB_ROOT=/app/web/dist, local dev uses ../dist
const indexPath = process.env.WEB_ROOT 
  ? path.join(process.env.WEB_ROOT, 'index.html')
  : path.join(__dirname, '../dist/index.html');
res.sendFile(indexPath);
```

## How It Works

1. **Golden Path Deployment:** Uses `WEB_ROOT=/app/web/dist` (set by build system)
2. **Local Development:** Falls back to `../dist` (relative path)
3. **Backward Compatible:** Works in both environments

## Deployment Status

✅ **Committed:** cb34125  
✅ **Pushed:** Successfully pushed to main branch  
🔄 **Deploying:** Golden Path will automatically rebuild and redeploy

## Verification Steps

After the automatic redeployment completes:

1. **Check Application Loads:**
   - Navigate to your app URL
   - You should see the React frontend instead of "Not Found"

2. **Check Logs:**
   - The `ENOENT: no such file or directory, stat '/app/dist/index.html'` error should be gone
   - You should see: `🌐 Serving frontend from /dist`

3. **Test API Endpoints:**
   - API routes should work: `/api/health`, `/api/upload`, etc.

4. **Test Frontend Routes:**
   - Navigate to different pages in the app
   - All routes should load correctly

## About Instana Warnings

The Instana warnings you're seeing are **NOT blocking** and are expected:

```
The Instana host agent can neither be reached via 127.0.0.1:42699...
```

**Why this happens:**
- Instana collector tries to connect to a local host agent
- In containerized environments without the Instana agent installed, this is normal
- The app will continue to retry but function normally
- These warnings can be safely ignored

**Optional fixes:**
1. Install Instana agent in your Dinero environment
2. Or configure Instana to not attempt local connections in production

## Summary

✅ **Fixed:** Server now respects Golden Path's `WEB_ROOT` environment variable  
✅ **Committed & Pushed:** Changes are live in the repository  
✅ **Auto-Deploy:** Golden Path will rebuild and redeploy automatically  
⚠️ **Note:** Instana warnings are non-blocking and can be ignored

## Timeline

- **Initial Issue:** Server looking in wrong path (`/app/dist` vs `/app/web/dist`)
- **First Attempt:** Modified Dockerfile (not used by Golden Path)
- **Correct Fix:** Modified server.js to use `WEB_ROOT` environment variable
- **Status:** Deployed and awaiting automatic rebuild

---
**Made with Bob**