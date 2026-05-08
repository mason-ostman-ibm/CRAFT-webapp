# Bug Fix: Job Status 404 Infinite Polling Loop

## Issue Summary
The Node.js backend was not properly handling 404 responses from the Python microservice when polling job status, causing the frontend to continue polling indefinitely with invalid job IDs.

## Root Cause
When the Python microservice returned a 404 "Job not found" error, the Node.js backend:
1. Received the 404 response
2. Did NOT check the response status code
3. Parsed the JSON error message
4. Returned it to the frontend without a `status` field
5. Frontend continued polling because it only stops on `status: 'completed'` or `status: 'failed'`

## Symptoms
- Multiple consecutive "Job not found" errors in browser DevTools
- Network tab showing repeated failed status requests
- Frontend never stops polling
- User sees infinite loading state

## Files Changed

### 1. Backend: `api/server.js`
**Lines Modified**: 1035-1090, 1157-1222

**Changes Made**:
- Added 404 status code check before parsing JSON
- Return structured error with `status: 'failed'` field
- Added error handling for other HTTP errors
- Applied fix to both `/api/python/job/:jobId/status` and `/api/delta/job/:jobId/status`

**Before**:
```javascript
const response = await fetch(`${PYTHON_SERVICE_URL}/job/${jobId}/status`);
const result = await response.json(); // ❌ No status check
res.status(response.status).json(result);
```

**After**:
```javascript
const response = await fetch(`${PYTHON_SERVICE_URL}/job/${jobId}/status`);

// ✅ Handle 404
if (response.status === 404) {
  return res.status(404).json({
    status: 'failed',
    error: 'Job not found',
    message: 'Job not found or expired. Jobs expire after 24 hours.'
  });
}

// ✅ Handle other errors
if (!response.ok) {
  const errorText = await response.text();
  return res.status(response.status).json({
    status: 'failed',
    error: `Python service error: ${errorText}`,
    message: 'Failed to get job status'
  });
}

const result = await response.json();
```

### 2. Frontend: `src/pages/ProcessPage.tsx`
**Lines Modified**: 202-230

**Changes Made**:
- Added HTTP status code checks before parsing JSON
- Stop polling on 404 errors
- Stop polling on other HTTP errors
- Stop polling on malformed responses (no status field)
- Show user-friendly error messages

**Before**:
```typescript
const statusRes = await fetch(`/api/python/job/${jobId}/status`);
const statusData = await statusRes.json(); // ❌ No status check
```

**After**:
```typescript
const statusRes = await fetch(`/api/python/job/${jobId}/status`);

// ✅ Stop polling on 404
if (statusRes.status === 404) {
  clearInterval(pollingRef.current!);
  pollingRef.current = null;
  setError('Job not found. It may have expired (jobs expire after 24 hours).');
  setIsProcessing(false);
  return;
}

// ✅ Stop polling on other errors
if (!statusRes.ok) {
  clearInterval(pollingRef.current!);
  pollingRef.current = null;
  setError(`Failed to check job status: ${statusRes.statusText}`);
  setIsProcessing(false);
  return;
}

const statusData = await statusRes.json();

// ✅ Stop polling on malformed response
if (!statusData.status) {
  clearInterval(pollingRef.current!);
  pollingRef.current = null;
  setError('Invalid response from server. Job may not exist.');
  setIsProcessing(false);
  return;
}
```

## Testing

### Test Case 1: Invalid Job ID
```bash
# Test with invalid job ID
curl http://localhost:3000/api/python/job/invalid-id-123/status

# Expected Response:
{
  "status": "failed",
  "error": "Job not found",
  "message": "Job not found or expired. Jobs expire after 24 hours."
}
```

### Test Case 2: Valid Job ID
```bash
# Submit a real job
curl -X POST http://localhost:3000/api/python/process \
  -F "file=@test.xlsx" \
  -F "context=test"

# Get job_id from response, then poll
curl http://localhost:3000/api/python/job/{job_id}/status

# Expected: Normal status response with progress
```

### Test Case 3: Frontend Behavior
1. Process a file successfully
2. Wait for completion
3. Refresh the browser page
4. Should NOT see infinite "Job not found" errors
5. Should see a clear error message if old job_id is used

## Impact
- **Before**: Infinite polling loop causing network spam and poor UX
- **After**: Clean error handling with immediate polling stop and user feedback

## Related Issues
- Jobs expire after 24 hours (Python microservice TTL)
- In-memory job storage is lost on microservice restart
- Consider enabling Redis for production persistence

## Race Condition Fix (Follow-up)

### Additional Issue Discovered
After the initial fix, a race condition was discovered where the frontend would poll for job status before the Python microservice had fully created the job in its storage.

### Additional Changes

**Frontend: `src/pages/ProcessPage.tsx`**
- Added 1-second initial delay before first poll
- Added retry logic for first 3 404 responses (allows job creation to complete)
- Reset retry counter on successful response
- Only fail after 3 consecutive 404s

**Before**:
```typescript
const jobId: string = data.job_id;
// Immediately start polling
pollingRef.current = setInterval(async () => {
  const statusRes = await fetch(`/api/python/job/${jobId}/status`);
  if (statusRes.status === 404) {
    // Immediately fail
    setError('Job not found');
    return;
  }
}, 3000);
```

**After**:
```typescript
const jobId: string = data.job_id;
let retryCount = 0;
const maxInitialRetries = 3;

// Wait 1 second before first poll
await new Promise(resolve => setTimeout(resolve, 1000));

pollingRef.current = setInterval(async () => {
  const statusRes = await fetch(`/api/python/job/${jobId}/status`);
  if (statusRes.status === 404) {
    retryCount++;
    if (retryCount <= maxInitialRetries) {
      return; // Retry
    }
    // Only fail after 3 retries
    setError('Job not found');
    return;
  }
  retryCount = 0; // Reset on success
}, 3000);
```

## Deployment Notes
1. Deploy backend changes first (backward compatible)
2. Deploy frontend changes second
3. No database migrations required
4. No environment variable changes needed
5. **Important**: The 1-second delay and retry logic handle the race condition between job creation and first status poll

## Prevention
- Always check HTTP status codes before parsing responses
- Always include a `status` field in error responses
- Add timeout/max retry logic to polling mechanisms
- Consider WebSocket for real-time updates instead of polling

---

**Fixed By**: Bob (AI Assistant)
**Date**: 2026-04-08
**Severity**: High (affects all users with expired jobs)
**Status**: ✅ Fixed