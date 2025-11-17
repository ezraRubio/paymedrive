# Testing Phase 1 Improvements - Quick Guide

## Quick Start

### 1. Build and Start Server
```bash
cd /Users/ezra/paymedrive/server
npm run build
npm run dev
```

### 2. Monitor Memory in Another Terminal
```bash
# Option A: Watch health endpoint
watch -n 2 'curl -s http://localhost:3000/health | jq ".memory"'

# Option B: Watch server logs
tail -f /Users/ezra/paymedrive/server/logs/combined.log | grep -i "memory\|queue"
```

### 3. Test Upload from Client
```bash
cd /Users/ezra/paymedrive/client
npm start
```

---

## Memory Expectations

### ✅ Good Signs:
- **Heap Used**: Stays under 500MB during uploads
- **Heap Used**: Spikes to ~1GB during finalization, then drops
- **Queue Size**: Shows in logs (e.g., "Queue: 2")
- **No timeouts**: Chunks upload successfully

### ❌ Warning Signs:
- **Heap Used > 1GB**: Check queue size, may need adjustment
- **Heap Used > 2GB**: Critical threshold, uploads rejected
- **Timeouts**: Check logs for errors

---

## Test Scenarios

### Test 1: Small File (10MB)
**Expected**:
- Memory increase: ~20MB
- Upload time: 5-10 seconds
- No queue backlog

### Test 2: Medium File (50MB)
**Expected**:
- Memory increase: ~70MB
- Upload time: 20-40 seconds
- Queue size: 0-2

### Test 3: Large File (100MB+)
**Expected**:
- Memory increase: ~120-150MB
- Upload time: 1-2 minutes
- Queue size: 2-5
- Memory drops after completion

---

## Interpreting Logs

### Good Log Pattern:
```
INFO: Memory usage check { heapUsed: '145.23 MB', heapTotal: '250.50 MB' }
INFO: Chunk 5/50 uploaded for upload-123 (5/50 total) [Queue: 2]
INFO: Chunk 6/50 uploaded for upload-123 (6/50 total) [Queue: 1]
INFO: Finalizing upload upload-123, assembling 50 chunks
INFO: Assembled 50 chunks for upload upload-123 (104857600 bytes)
INFO: Successfully finalized upload upload-123 as file abc-123
INFO: Memory usage check { heapUsed: '180.45 MB', heapTotal: '250.50 MB' }
```

### Warning Pattern:
```
WARN: WARNING: High memory usage detected { heapUsed: '1.2 GB', ... }
```

### Critical Pattern:
```
ERROR: CRITICAL: Memory usage above threshold { heapUsed: '2.1 GB', ... }
ERROR: Rejecting upload request due to critical memory usage
```

---

## Troubleshooting

### Issue: Memory Still Growing
**Check**:
1. Is cleanup happening after uploads?
   ```bash
   ls -la /Users/ezra/paymedrive/chunks/
   ```
2. Are there stale uploads?
3. Are multiple large files uploading simultaneously?

**Fix**:
- Reduce queue size to 3
- Clear chunks directory manually
- Upload files one at a time

### Issue: Slow Uploads
**Check**:
1. Queue backing up? (Queue: > 10)
2. Disk I/O slow?

**Fix**:
- Increase queue size to 7-10
- Check disk space

### Issue: Timeouts
**Check**:
1. Memory critical? (> 2GB)
2. Queue full?

**Fix**:
- Restart server
- Clear chunks directory
- Reduce concurrent uploads

---

## Health Check Command

```bash
curl http://localhost:3000/health | jq
```

**Expected Response**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T...",
  "uptime": 123.45,
  "memory": {
    "heapUsed": "145.23 MB",
    "heapTotal": "250.50 MB",
    "rss": "300.00 MB",
    "external": "5.10 MB",
    "percentUsed": 58.09
  }
}
```

---

## Success Criteria

Phase 1 is successful if:
- ✅ Memory stays under 1GB during uploads
- ✅ No `/file/chunk` timeouts
- ✅ CPU stays under 50%
- ✅ Multiple 50MB+ files can upload sequentially
- ✅ Server remains responsive throughout

If all criteria met → **Proceed to Phase 2**

---

## Quick Commands

```bash
# Build server
cd /Users/ezra/paymedrive/server && npm run build

# Run tests
npm test -- chunk.streaming.test.ts

# Start server
npm run dev

# Watch memory
watch -n 2 'curl -s http://localhost:3000/health | jq ".memory"'

# Check logs
tail -f logs/combined.log

# Clear chunks (if needed)
rm -rf /Users/ezra/paymedrive/chunks/*

# Check chunk storage
du -sh /Users/ezra/paymedrive/chunks/
ls -la /Users/ezra/paymedrive/chunks/
```
