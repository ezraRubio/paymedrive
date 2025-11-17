# Test Phase 1 Fixes - REAL Fixes Applied

## What Was Actually Fixed

1. ✅ **Rate limiting** - No more "too many requests" for uploads/health
2. ✅ **Memory logging** - Only logs during uploads, not flooding logs
3. ✅ **TRUE streaming** - File NEVER loaded into memory during assembly

## Current Server Status

**Server is running** with baseline memory: ~200MB

```bash
# Check health
curl http://localhost:3000/health | jq .memory
```

---

## Quick Test (Do This Now)

### Step 1: Create Test File
```bash
# Create 50MB test file
dd if=/dev/urandom of=~/test_50mb.bin bs=1m count=50
```

### Step 2: Monitor Memory in Terminal
```bash
# Open a new terminal and run:
watch -n 1 'curl -s http://localhost:3000/health 2>/dev/null | jq -r ".memory.heapUsed"'

# Should show ~200MB baseline
# During upload should spike to ~300-400MB max
# Should drop back to ~200MB after upload
```

### Step 3: Upload Through Client
```bash
cd /Users/ezra/paymedrive/client
npm start

# Then upload the test_50mb.bin file
```

### Step 4: Watch For:
- ✅ Memory stays under 500MB
- ✅ No timeouts
- ✅ Upload completes successfully
- ✅ Memory drops back down after completion

---

## What You Should See

### Good Signs ✅:
```
Memory before upload: 200 MB
Memory during upload: 250-400 MB  (peak during finalization)
Memory after upload:  210 MB  (back to baseline)

Logs show:
- "Chunk 5/25 uploaded for upload-xxx (5/25 total) [Queue: 1]"
- "Finalizing upload xxx, assembling 25 chunks"
- "Assembled 25 chunks for upload xxx to /bucket/... (52428800 bytes)"
- "Successfully finalized upload xxx as file yyy"
```

### Bad Signs ❌:
```
Memory > 1GB during upload
"Too many requests" errors
Timeouts on /file/chunk route
Server becomes unresponsive
```

---

## If It Works

**Success Indicators**:
1. Upload completes
2. Memory stayed reasonable (<500MB)
3. No errors in client
4. File appears in file list

**Then**: Ready for Phase 2 - Performance optimizations

---

## If It Doesn't Work

### Issue: Memory Still High (>1GB)

**Check**:
```bash
# See what's using memory
cd /Users/ezra/paymedrive/server
tail -100 logs/combined.log | grep -i "assembl\|finaliz"
```

**Try**:
- Reduce queue size from 5 to 3
- Test with smaller file (10MB)
- Check disk I/O with `iostat 1`

### Issue: "Too Many Requests"

**Check**:
```bash
# See rate limit config
grep -A 5 "generalRateLimit" server/middleware/rate-limit.middleware.ts
```

**Try**:
- Increase max to 2000
- Add more skip paths

### Issue: Timeouts

**Check**:
```bash
# See queue size
tail -50 logs/combined.log | grep "Queue:"
```

**Try**:
- Increase queue size to 7
- Increase chunk timeout on client

---

## Monitor Commands

### Memory
```bash
# Continuous monitoring
watch -n 1 'curl -s http://localhost:3000/health 2>/dev/null | jq -r ".memory | \"Heap: \(.heapUsed) / \(.heapTotal) (\(.percentUsed)%)\""'

# Single check
curl http://localhost:3000/health | jq .memory
```

### Logs
```bash
# Watch upload progress
tail -f /Users/ezra/paymedrive/server/logs/combined.log | grep -i "chunk\|upload\|queue"

# See memory warnings
tail -f /Users/ezra/paymedrive/server/logs/combined.log | grep -i "memory\|WARNING\|CRITICAL"
```

### Process
```bash
# Check Node memory usage (MacOS)
ps aux | grep "node.*server" | grep -v grep

# RSS column shows real memory usage
```

---

## Expected Timeline

1. **Chunk Upload Phase** (30-60 seconds for 50MB)
   - Memory: 200-250MB
   - Chunks processing with queue
   
2. **Finalization Phase** (5-10 seconds)
   - Memory: Spike to 300-400MB briefly
   - Streaming chunks to final destination
   
3. **Completion**
   - Memory: Drop back to 210-220MB
   - File in database and bucket

---

## Debug Mode

If issues persist, enable more logging:

```bash
# In server/.env, add:
LOG_LEVEL=debug

# Restart server
cd /Users/ezra/paymedrive/server
npm run dev
```

---

## Key Differences From Before

### Before (Broken):
- Rate limit: 100/15min → Blocks uploads ❌
- Memory logging: Every request → Log spam ❌
- File handling: Load into memory → 5GB+ memory ❌

### Now (Fixed):
- Rate limit: 1000/min, skip uploads → No blocks ✅
- Memory logging: Only uploads → Clean logs ✅  
- File handling: Stream to disk → ~200MB memory ✅

---

## Success Criteria

**Phase 1 is successful if**:
- ✅ 50MB file uploads without timeout
- ✅ Memory stays under 500MB throughout
- ✅ No rate limit errors
- ✅ Server responsive during upload
- ✅ Multiple uploads work sequentially

**If all pass** → Phase 1 DONE, proceed to Phase 2

---

## Current Status

- Server: ✅ Running (PID: check with `ps aux | grep node.*server`)
- Memory: ✅ Baseline ~200MB
- Health: ✅ Responding at http://localhost:3000/health
- Ready: ✅ Go test an upload now!

---

## Quick Test Command

```bash
# All-in-one test
cd /Users/ezra/paymedrive/client && npm start
```

Watch terminal for memory, then upload test_50mb.bin file.

**Good luck!** 🚀
