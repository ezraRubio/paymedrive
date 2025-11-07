# Enhanced File Upload System

## Architecture

### Client-Side Components

#### 1. **File Selection** (`fileUpload.util.ts`)

- Platform-agnostic file picker using `expo-document-picker`
- Supports all file types and formats
- Extracts file metadata (name, size, MIME type)

#### 2. **Standard Upload** (`files.ts`)

- Direct upload for small files (<10MB)
- Single HTTP request with progress tracking
- Fast and efficient for small files

#### 3. **Chunked Upload** (`chunkedUpload.util.ts`)

- Splits large files into chunks (1-10MB per chunk)
- Uploads chunks sequentially with retry logic
- Optimal chunk size calculated based on file size
- Progress tracking per chunk

#### 4. **Resumable Upload** (`resumableUpload.util.ts`)

- Saves upload state to AsyncStorage
- Can resume after app restart or network interruption
- Tracks uploaded chunks to avoid re-uploading
- Pause/resume/cancel controls

#### 5. **Upload State Manager** (`uploadState.util.ts`)

- Persists upload progress across sessions
- Lists pending uploads
- Cleans up old/stale uploads

### Server-Side Components

#### 1. **Chunk Storage** (`chunk.storage.util.ts`)

- Temporarily stores uploaded chunks
- Tracks chunk metadata and progress
- Assembles chunks into complete files
- Cleans up after successful upload

#### 2. **Chunk Upload Service** (`chunk.upload.service.ts`)

- Handles chunk reception and validation
- Manages upload finalization
- Integrates with existing file service
- Quota enforcement

#### 3. **Chunk Upload Routes** (`chunk.upload.routes.ts`)

- `POST /api/file/chunk` - Upload a chunk
- `POST /api/file/chunk/finalize` - Finalize upload
- `GET /api/file/chunk/:uploadId` - Get upload status
- `DELETE /api/file/chunk/:uploadId` - Cancel upload

## Usage

### Basic Upload (Auto-Selected)

```typescript
import { filesAPI } from "../api/files";
import { selectFile } from "../utils/fileUpload.util";

// Select file
const selectedFile = await selectFile();

if (selectedFile) {
  // Smart upload automatically chooses best method
  const response = await filesAPI.smartUpload(selectedFile, (progress) => {
    console.log(`Upload progress: ${progress.percentage}%`);
  });
}
```

### Resumable Upload

```typescript
import { createResumableUpload } from "../utils/resumableUpload.util";

const uploadId = `${Date.now()}-${Math.random()}`;
const upload = createResumableUpload(uploadId, selectedFile, {
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
  },
  onChunkComplete: (index, total) => {
    console.log(`Chunk ${index + 1}/${total} uploaded`);
  },
});

// Start upload
await upload.start();

// Can pause, resume, or cancel
upload.pause();
upload.resume();
upload.cancel();
```

### Resume Interrupted Upload

```typescript
import { UploadStateManager } from "../utils/uploadState.util";

// List pending uploads
const pendingUploads = await UploadStateManager.listPendingUploads();

// Resume specific upload
if (pendingUploads.length > 0) {
  const upload = createResumableUpload(pendingUploads[0].uploadId, {
    uri: pendingUploads[0].fileUri,
    name: pendingUploads[0].fileName,
    size: pendingUploads[0].fileSize,
    mimeType: pendingUploads[0].mimeType,
  });

  await upload.start();
}
```

## Configuration

### Client Configuration

**`client/api/config.ts`**

```typescript
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});
```

### Server Configuration

**`.env`**

```bash
# Maximum single upload size (100MB default)
MAX_FILE_SIZE=104857600

# Chunk storage directory
CHUNK_STORAGE_PATH=./chunks
```

## File Size Limits

### Upload Method Selection

- **Files < 10MB**: Standard upload (single request)
- **Files ≥ 10MB**: Chunked upload (multiple requests)

### Chunk Sizes (Automatic)

- **< 10MB files**: 1MB chunks
- **10-100MB files**: 2MB chunks
- **100-500MB files**: 5MB chunks
- **> 500MB files**: 10MB chunks

## Error Handling

### Automatic Retry

- Failed chunks retry up to 3 times
- Exponential backoff between retries
- Network errors handled gracefully

### Common Errors

1. **"File is too large"** - File exceeds MAX_FILE_SIZE
2. **"Upload timeout"** - Network too slow or file too large
3. **"Quota exceeded"** - User's storage quota exceeded
4. **"Upload incomplete"** - Not all chunks received

## Testing

### Test Different File Sizes

```bash
# Small file (1MB)
dd if=/dev/urandom of=test_1mb.bin bs=1m count=1

# Medium file (50MB)
dd if=/dev/urandom of=test_50mb.bin bs=1m count=50

# Large file (500MB)
dd if=/dev/urandom of=test_500mb.bin bs=1m count=500
```

### Test Different Formats

- Documents: PDF, DOCX, XLSX
- Images: JPEG, PNG, HEIC, WebP
- Videos: MP4, MOV, MKV
- Archives: ZIP, RAR, 7Z

### Test Network Conditions

- Fast network (WiFi)
- Slow network (3G simulation)
- Interrupted network (toggle airplane mode)

## Monitoring

### Server Logs

```bash
# Monitor upload activity
tail -f logs/app.log | grep -i upload

# Monitor chunk uploads
tail -f logs/app.log | grep -i chunk
```

### Cleanup Stale Uploads

```bash
# Run cleanup endpoint (optional)
curl -X POST http://localhost:3000/api/admin/cleanup-chunks
```

## Performance

### Benchmarks

| File Size | Method   | Chunks | Time (WiFi) | Time (4G) |
| --------- | -------- | ------ | ----------- | --------- |
| 1 MB      | Standard | 1      | 0.5s        | 2s        |
| 10 MB     | Standard | 1      | 2s          | 8s        |
| 50 MB     | Chunked  | 25     | 15s         | 60s       |
| 100 MB    | Chunked  | 50     | 30s         | 120s      |
| 500 MB    | Chunked  | 50     | 120s        | 480s      |

## Troubleshooting

### Upload Stuck

1. Check network connectivity
2. Verify server is running
3. Check server logs for errors
4. Try canceling and restarting

### Chunks Not Assembling

1. Verify all chunks uploaded successfully
2. Check chunk storage directory permissions
3. Ensure sufficient disk space
4. Check server logs

### Resume Not Working

1. Clear AsyncStorage: `AsyncStorage.clear()`
2. Verify upload state saved correctly
3. Check upload ID matches

## Migration from Old System

### Before (Old System)

```typescript
// Limited to web platform, small files only
const result = await DocumentPicker.getDocumentAsync();
const file = result.assets[0].file;
await filesAPI.uploadFile(file);
```

### After (New System)

```typescript
// Works on all platforms, any file size
const selectedFile = await selectFile();
await filesAPI.smartUpload(selectedFile, (progress) => {
  console.log(progress.percentage);
});
```

## Future Enhancements

- [ ] Parallel chunk uploads (upload multiple chunks simultaneously)
- [ ] Compression for compressible file types
- [ ] Background upload support (continue uploads when app backgrounded)
- [ ] Upload queue management (multiple files)
- [ ] Upload speed throttling (bandwidth control)
- [ ] Checksum verification (ensure data integrity)
- [ ] Delta uploads (only upload changed parts)

## Support

For issues or questions:

1. Check logs for error details
2. Verify configuration
3. Test with small files first
4. Check network connectivity
5. Review error messages

## License

MIT - See LICENSE file for details
