# Progress Tracking System

This document describes the two-phase progress tracking implementation for the Excel AI Processor.

## Overview

The progress tracking system provides users with visual feedback and time estimates during AI processing. It's implemented in two phases:

- **Phase 1**: Client-side estimation (✅ Implemented)
- **Phase 2**: Real-time progress from microservice (📋 Future Enhancement)

---

## Phase 1: Client-Side Progress Estimation

### Status: ✅ Implemented

### Architecture

```
┌─────────────┐
│   Frontend  │
│             │
│ ┌─────────┐ │
│ │ Upload  │ │ → Count questions
│ │  File   │ │
│ └─────────┘ │
│      ↓      │
│ ┌─────────┐ │
│ │ Process │ │ → Start timer
│ │ Button  │ │
│ └─────────┘ │
│      ↓      │
│ ┌─────────┐ │
│ │  Poll   │ │ → Every 3 seconds
│ │ Status  │ │
│ └─────────┘ │
│      ↓      │
│ ┌─────────┐ │
│ │Calculate│ │ → Estimate progress
│ │Progress │ │   based on elapsed time
│ └─────────┘ │
│      ↓      │
│ ┌─────────┐ │
│ │ Display │ │ → Show progress bar
│ │Progress │ │   with time estimate
│ └─────────┘ │
└─────────────┘
```

### Components

#### 1. ProcessingProgress Component

**Location**: `src/components/ProcessingProgress.tsx`

**Features**:
- Animated progress bar using Carbon Design System
- Time estimation display (remaining and elapsed)
- Question count display
- Stage-based status messages
- Spinning icon animation
- Responsive grid layout

**Props**:
```typescript
interface ProcessingProgressProps {
  progress: number;              // 0-100 percentage
  timeRemaining: number | null;  // seconds
  statusMessage: string;         // current status text
  questionCount?: number;        // total questions
  elapsedTime?: number;          // seconds elapsed
}
```

#### 2. ProcessPage Integration

**Location**: `src/pages/ProcessPage.tsx`

**New State Variables**:
```typescript
const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
const [estimatedProgress, setEstimatedProgress] = useState(0);
const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
const [elapsedTime, setElapsedTime] = useState(0);
```

### Estimation Algorithm

**Time-Based Logarithmic Curve** (does not rely on question count):

```typescript
// Time milestones (in seconds) for progress stages
const STAGE_TIMES = {
  queued: 5,      // 0-5s: 0-5%
  analyzing: 15,  // 5-15s: 5-15%
  processing: 120, // 15-120s: 15-90%
  finalizing: 180  // 120-180s: 90-95%
};

// Progress calculation uses logarithmic curve for smooth deceleration
// This provides steady progress without needing accurate question count
if (elapsed < 5s) {
  progress = 0-5%
} else if (elapsed < 15s) {
  progress = 5-15%
} else if (elapsed < 120s) {
  progress = 15-90% (logarithmic curve)
} else if (elapsed < 180s) {
  progress = 90-95%
} else {
  progress = 95% (cap until completion)
}
```

**Why This Approach?**
- ✅ **No dependency on question count** - works regardless of file structure
- ✅ **Realistic expectations** - based on typical processing times
- ✅ **Smooth progress** - logarithmic curve prevents jumps
- ✅ **Handles variability** - adapts to different file sizes

### Progress Stages

The component automatically determines the processing stage based on progress:

| Progress | Stage | Description |
|----------|-------|-------------|
| 0-5% | Queuing | "Queuing job..." |
| 5-15% | Analyzing | "Analyzing document structure..." |
| 15-90% | Processing | "Processing questions with AI..." |
| 90-100% | Finalizing | "Finalizing results..." |

### Benefits

✅ **Immediate implementation** - No backend changes required  
✅ **Better UX** - Visual progress instead of spinner  
✅ **Time awareness** - Users know approximately how long to wait  
✅ **Professional appearance** - Matches modern web app standards  
✅ **Low risk** - Client-side only changes  

### Limitations

⚠️ Progress is **estimated** based on time, not actual completion
⚠️ Can't show which specific question is being processed
⚠️ May complete faster or slower than estimated (typical range: 1-5 minutes)
⚠️ No feedback if processing is stuck on a particular question
⚠️ Time estimates become less accurate for very large or very small files

---

## Phase 2: Real-Time Progress Tracking

### Status: 📋 Future Enhancement

### Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────────┐
│   Frontend  │         │   Node.js    │         │     Python      │
│             │         │   Backend    │         │  Microservice   │
│             │         │              │         │                 │
│ ┌─────────┐ │         │              │         │  ┌───────────┐  │
│ │  Poll   │ │────────▶│   Proxy      │────────▶│  │   Job     │  │
│ │ Status  │ │         │   Request    │         │  │  Status   │  │
│ └─────────┘ │         │              │         │  │ Endpoint  │  │
│      ↓      │         │              │         │  └───────────┘  │
│ ┌─────────┐ │         │              │         │       ↓         │
│ │ Display │ │◀────────│   Return     │◀────────│  ┌───────────┐  │
│ │Progress │ │         │   Progress   │         │  │   Job     │  │
│ └─────────┘ │         │              │         │  │   State   │  │
│             │         │              │         │  │   Store   │  │
└─────────────┘         └──────────────┘         │  └───────────┘  │
                                                 │       ↑         │
                                                 │  ┌───────────┐  │
                                                 │  │    Job    │  │
                                                 │  │ Processor │  │
                                                 │  └───────────┘  │
                                                 └─────────────────┘
```

### Required Changes

#### 1. Python Microservice Modifications

**Repository**: `CRAFT-python-microservice`

**File**: `flask_api.py` (or equivalent job processor)

**Add Progress Data Model**:

```python
# Enhanced job state structure
job_state = {
    "job_id": "abc123",
    "status": "processing",  # queued, processing, completed, failed
    "message": "Processing questions...",
    "progress": {
        "total_questions": 50,
        "processed_questions": 23,
        "current_question": "What is your governance framework?",
        "current_sheet": "Sheet1",
        "percentage": 46,
        "stage": "processing",  # queued, analyzing, processing, finalizing
        "estimated_time_remaining": 135,  # seconds
        "processing_rate": 4.2  # seconds per question
    },
    "started_at": "2026-03-30T21:00:00Z",
    "updated_at": "2026-03-30T21:01:35Z"
}
```

**Update Job Processing Loop**:

```python
def process_excel_job(job_id, file_path, context):
    """Process Excel file with progress tracking"""
    
    # Get job state
    job_state = get_job_state(job_id)
    
    # Extract questions
    questions = extract_questions(file_path)
    
    # Initialize progress
    job_state.update({
        'status': 'processing',
        'progress': {
            'total_questions': len(questions),
            'processed_questions': 0,
            'percentage': 0,
            'stage': 'analyzing'
        },
        'started_at': datetime.utcnow().isoformat()
    })
    save_job_state(job_id, job_state)
    
    start_time = time.time()
    
    # Process each question
    for i, question in enumerate(questions):
        # Generate answer
        answer = generate_answer(question, context)
        
        # Update progress
        processed = i + 1
        elapsed = time.time() - start_time
        rate = elapsed / processed
        remaining = (len(questions) - processed) * rate
        
        job_state['progress'].update({
            'processed_questions': processed,
            'current_question': question['text'][:100],  # Truncate long questions
            'current_sheet': question['sheet'],
            'percentage': int((processed / len(questions)) * 100),
            'stage': 'processing',
            'estimated_time_remaining': int(remaining),
            'processing_rate': round(rate, 2)
        })
        job_state['updated_at'] = datetime.utcnow().isoformat()
        
        # Save progress (every question or every N seconds)
        save_job_state(job_id, job_state)
    
    # Mark as complete
    job_state['status'] = 'completed'
    job_state['progress']['stage'] = 'finalizing'
    job_state['progress']['percentage'] = 100
    save_job_state(job_id, job_state)
```

**Status Endpoint** (already exists, just returns enhanced data):

```python
@app.route('/job/<job_id>/status', methods=['GET'])
def get_job_status(job_id):
    """Get job status with progress information"""
    job_state = get_job_state(job_id)
    return jsonify(job_state)
```

#### 2. Backend Changes

**File**: `api/server.js`

**No changes required!** The existing proxy at line 1035 already passes through all data:

```javascript
app.get('/api/python/job/:jobId/status', async (req, res) => {
  const { jobId } = req.params;
  const response = await fetch(`${PYTHON_SERVICE_URL}/job/${jobId}/status`);
  const result = await response.json();
  // ... caching logic ...
  res.status(response.status).json(result);  // Passes through progress data
});
```

#### 3. Frontend Changes

**File**: `src/pages/ProcessPage.tsx`

**Update Interface**:

```typescript
interface ProgressData {
  total_questions: number;
  processed_questions: number;
  current_question: string;
  current_sheet: string;
  percentage: number;
  stage: 'queued' | 'analyzing' | 'processing' | 'finalizing';
  estimated_time_remaining: number;
  processing_rate: number;
}

interface ProcessResult {
  // ... existing fields
  progress?: ProgressData;
}
```

**Update Polling Logic**:

```typescript
// In polling interval
const statusData = await statusRes.json();

// Use real progress if available, fall back to estimation
if (statusData.progress) {
  // Real-time progress from microservice
  setEstimatedProgress(statusData.progress.percentage);
  setEstimatedTimeRemaining(statusData.progress.estimated_time_remaining);
  setStatusMessage(
    `Processing: ${statusData.progress.processed_questions}/${statusData.progress.total_questions} questions`
  );
} else {
  // Fall back to client-side estimation
  // ... existing estimation logic ...
}
```

**File**: `src/components/ProcessingProgress.tsx`

**Add Real-Time Features**:

```typescript
interface ProcessingProgressProps {
  // ... existing props
  currentQuestion?: string;      // NEW: Current question being processed
  processedCount?: number;       // NEW: Questions processed so far
  totalCount?: number;           // NEW: Total questions
  stage?: string;                // NEW: Processing stage from server
  isRealTime?: boolean;          // NEW: Flag for real vs estimated
}

// In component
{currentQuestion && (
  <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#393939' }}>
    <p style={{ fontSize: '0.75rem', color: '#8d8d8d', marginBottom: '0.5rem' }}>
      Currently Processing:
    </p>
    <p style={{ fontSize: '0.875rem', color: '#f4f4f4' }}>
      {currentQuestion}
    </p>
  </div>
)}

{isRealTime && (
  <Tag type="green" size="sm">Real-time Progress</Tag>
)}
```

### Benefits of Phase 2

✅ **Accurate progress** - Real-time data from microservice  
✅ **Detailed visibility** - See current question being processed  
✅ **Better estimates** - Based on actual processing rate  
✅ **Professional monitoring** - Enterprise-grade progress tracking  
✅ **Debugging capability** - Can identify stuck questions  
✅ **User confidence** - Shows actual work being done  

### Implementation Checklist

- [ ] Access to `CRAFT-python-microservice` repository
- [ ] Modify job processing loop to emit progress
- [ ] Update job state storage to include progress data
- [ ] Test progress updates in local environment
- [ ] Deploy to Code Engine staging environment
- [ ] Update frontend to consume progress data
- [ ] Add fallback to Phase 1 estimation if progress unavailable
- [ ] Test end-to-end with various file sizes
- [ ] Monitor performance impact of frequent state updates
- [ ] Document for future maintainers

### Performance Considerations

**State Update Frequency**:
- Update progress after each question (recommended)
- OR update every N seconds (e.g., every 5 seconds) to reduce I/O
- Balance between responsiveness and performance

**Storage**:
- Use in-memory store (Redis) for job state
- Persist to database only on completion
- Set TTL for job states (e.g., 24 hours)

**Network**:
- Frontend polls every 3 seconds (existing)
- No need to change polling frequency
- Progress data adds ~200 bytes per response

---

## Testing

### Phase 1 Testing

1. **Upload a file** with known question count
2. **Start processing** and verify:
   - Progress bar appears
   - Time remaining is calculated
   - Elapsed time updates
   - Progress increases over time
   - Progress caps at 95% until completion
3. **Wait for completion** and verify:
   - Progress reaches 100%
   - Time remaining reaches 0
   - Success message appears

### Phase 2 Testing (Future)

1. **Upload a file** with known question count
2. **Start processing** and verify:
   - Real-time progress updates
   - Current question displays
   - Processed count increments
   - Time estimates adjust based on actual rate
3. **Test edge cases**:
   - Very small files (1-2 questions)
   - Large files (50+ questions)
   - Network interruptions during processing
   - Fallback to estimation if progress unavailable

---

## Troubleshooting

### Phase 1 Issues

**Progress not updating**:
- Check browser console for errors
- Verify polling is active (check Network tab)
- Ensure `processingStartTime` is set

**Time estimates wildly inaccurate**:
- Adjust `AVG_TIME_PER_QUESTION` constant
- Consider question complexity variations
- Add calibration based on historical data

**Progress bar stuck**:
- Check if job is actually processing (backend logs)
- Verify polling interval is working
- Check for JavaScript errors

### Phase 2 Issues (Future)

**Progress data not appearing**:
- Verify Python microservice is returning progress
- Check backend proxy is passing through data
- Inspect network responses for progress field

**Progress updates too slow**:
- Reduce state update frequency in Python
- Check Redis/storage performance
- Verify network latency

---

## Future Enhancements

### Phase 3 Ideas

1. **Server-Sent Events (SSE)**:
   - Push progress updates instead of polling
   - Reduce network overhead
   - Instant updates

2. **Historical Calibration**:
   - Track actual processing times
   - Improve estimation accuracy
   - Adjust for question complexity

3. **Progress Persistence**:
   - Resume progress display after page refresh
   - Store in localStorage or session
   - Reconnect to in-progress jobs

4. **Advanced Analytics**:
   - Show processing rate graph
   - Identify slow questions
   - Performance metrics dashboard

---

## Maintenance

### Tuning Time Milestones

If typical processing times change, update the stage times in `ProcessPage.tsx`:

```typescript
const STAGE_TIMES = {
  queued: 5,      // Time to start processing
  analyzing: 15,  // Time to analyze document
  processing: 120, // Typical processing duration
  finalizing: 180  // Maximum expected time
};
```

**Calibration Tips**:
- Monitor actual completion times in production
- Adjust `processing` time based on median completion time
- Set `finalizing` to 95th percentile completion time
- Keep `queued` and `analyzing` relatively short (5-15s)

### Monitoring

Track these metrics:
- Average processing time per question
- Estimation accuracy (estimated vs actual)
- User satisfaction with progress visibility
- Performance impact of progress tracking

---

## References

- [Carbon Design System - ProgressBar](https://carbondesignsystem.com/components/progress-bar/usage/)
- [React State Management](https://react.dev/learn/managing-state)
- [Python Microservice Repository](../README.md#python-microservice)
- [Job Queue Architecture](./ARCHITECTURE.md#python-microservice-flask)

---

**Last Updated**: 2026-03-30  
**Phase 1 Status**: ✅ Implemented  
**Phase 2 Status**: 📋 Planned