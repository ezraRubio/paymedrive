import { ChunkStorageUtil } from '../../utils/chunk.storage.util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CHUNK_STORAGE_PATH = './test_chunks';

describe('ChunkStorageUtil - Streaming Implementation', () => {
  let chunkStorage: ChunkStorageUtil;
  const testUploadId = 'test-upload-streaming-123';
  const testFileName = 'test-file.bin';
  const testMimeType = 'application/octet-stream';

  beforeEach(() => {
    // Use a test-specific chunk storage path
    process.env.CHUNK_STORAGE_PATH = CHUNK_STORAGE_PATH;
    chunkStorage = new ChunkStorageUtil();

    // Clean up test directory if it exists
    if (fs.existsSync(CHUNK_STORAGE_PATH)) {
      fs.rmSync(CHUNK_STORAGE_PATH, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(CHUNK_STORAGE_PATH)) {
      fs.rmSync(CHUNK_STORAGE_PATH, { recursive: true, force: true });
    }
  });

  describe('Streaming Assembly', () => {
    it('should assemble chunks to file without loading all into memory', async () => {
      const totalChunks = 10;
      const chunkSize = 1024 * 1024; // 1MB per chunk
      const totalSize = totalChunks * chunkSize;
      const outputPath = path.join(os.tmpdir(), `test_output_${Date.now()}.bin`);

      try {
        // Initialize upload
        await chunkStorage.initializeUpload(
          testUploadId,
          testFileName,
          totalSize,
          testMimeType,
          totalChunks
        );

        // Create and save test chunks
        for (let i = 0; i < totalChunks; i++) {
          const chunkBuffer = Buffer.alloc(chunkSize, i); // Fill with index value
          await chunkStorage.saveChunk(testUploadId, i, chunkBuffer);
        }

        // Verify upload is complete
        const isComplete = await chunkStorage.isUploadComplete(testUploadId);
        expect(isComplete).toBe(true);

        // Measure memory before assembly
        const memBefore = process.memoryUsage().heapUsed;

        // Assemble chunks using streaming to file (NEW METHOD)
        const bytesWritten = await chunkStorage.assembleChunksToFile(testUploadId, outputPath);

        // Measure memory after assembly
        const memAfter = process.memoryUsage().heapUsed;
        const memoryIncrease = memAfter - memBefore;

        // Verify file was written correctly
        expect(bytesWritten).toBe(totalSize);
        expect(fs.existsSync(outputPath)).toBe(true);
        
        const stats = fs.statSync(outputPath);
        expect(stats.size).toBe(totalSize);

        // Memory increase should be minimal since we're not loading the file
        // Should only be the chunk buffers during streaming (much less than total file)
        const maxExpectedIncrease = chunkSize * 3; // Allow for a few chunks in memory
        expect(memoryIncrease).toBeLessThan(maxExpectedIncrease);

        console.log(`Memory increase during streaming: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
        console.log(`File size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);
        console.log(`Memory efficiency: ${((totalSize - memoryIncrease) / totalSize * 100).toFixed(1)}%`);
      } finally {
        // Clean up
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      }
    });

    it('should handle large files efficiently', async () => {
      const totalChunks = 50; // Simulate 100MB file
      const chunkSize = 2 * 1024 * 1024; // 2MB per chunk
      const totalSize = totalChunks * chunkSize;
      const outputPath = path.join(os.tmpdir(), `test_large_${Date.now()}.bin`);

      try {
        await chunkStorage.initializeUpload(
          testUploadId,
          testFileName,
          totalSize,
          testMimeType,
          totalChunks
        );

        // Save chunks (using smaller buffers for test speed)
        for (let i = 0; i < totalChunks; i++) {
          const chunkBuffer = Buffer.alloc(chunkSize, i % 256);
          await chunkStorage.saveChunk(testUploadId, i, chunkBuffer);
        }

        const startTime = Date.now();
        const bytesWritten = await chunkStorage.assembleChunksToFile(testUploadId, outputPath);
        const duration = Date.now() - startTime;

        expect(bytesWritten).toBe(totalSize);
        console.log(`Streaming assembly time for ${totalChunks} chunks: ${duration}ms`);
      } finally {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      }
    });

    it('should verify data integrity after streaming assembly', async () => {
      const totalChunks = 5;
      const chunkSize = 1024;
      const totalSize = totalChunks * chunkSize;

      await chunkStorage.initializeUpload(
        testUploadId,
        testFileName,
        totalSize,
        testMimeType,
        totalChunks
      );

      // Create chunks with predictable patterns
      const expectedData: number[] = [];
      for (let i = 0; i < totalChunks; i++) {
        const chunkBuffer = Buffer.alloc(chunkSize);
        for (let j = 0; j < chunkSize; j++) {
          const value = (i * chunkSize + j) % 256;
          chunkBuffer[j] = value;
          expectedData.push(value);
        }
        await chunkStorage.saveChunk(testUploadId, i, chunkBuffer);
      }

      const assembledBuffer = await chunkStorage.assembleChunks(testUploadId);

      // Verify data integrity
      expect(assembledBuffer.length).toBe(totalSize);
      for (let i = 0; i < totalSize; i++) {
        expect(assembledBuffer[i]).toBe(expectedData[i]);
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw error if upload is incomplete', async () => {
      const totalChunks = 3;
      const chunkSize = 1024;
      const totalSize = totalChunks * chunkSize;

      await chunkStorage.initializeUpload(
        testUploadId,
        testFileName,
        totalSize,
        testMimeType,
        totalChunks
      );

      // Save only 2 chunks, skip chunk 1
      await chunkStorage.saveChunk(testUploadId, 0, Buffer.alloc(chunkSize));
      await chunkStorage.saveChunk(testUploadId, 2, Buffer.alloc(chunkSize));

      // Should throw error because upload is incomplete
      await expect(chunkStorage.assembleChunks(testUploadId)).rejects.toThrow(
        'Upload incomplete'
      );
    });

    it('should clean up temporary file on error', async () => {
      const totalChunks = 2;
      const chunkSize = 1024;
      const totalSize = totalChunks * chunkSize;

      await chunkStorage.initializeUpload(
        testUploadId,
        testFileName,
        totalSize,
        testMimeType,
        totalChunks
      );

      await chunkStorage.saveChunk(testUploadId, 0, Buffer.alloc(chunkSize));
      // Don't save chunk 1

      const uploadDir = path.join(CHUNK_STORAGE_PATH, testUploadId);
      const tempFile = path.join(uploadDir, 'assembled_file');

      try {
        await chunkStorage.assembleChunks(testUploadId);
      } catch (error) {
        // Verify temp file was cleaned up
        expect(fs.existsSync(tempFile)).toBe(false);
      }
    });
  });
});
