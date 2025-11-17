import { ChunkStorageUtil } from '../utils/chunk.storage.util';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error-handler';
import { generateFileLocation, ensureBucketExists } from '../utils/storage.util';
import { canUploadFile } from '../utils/quota.util';
import { FileRepository } from '../repositories/file.repository';

const chunkStorage = new ChunkStorageUtil();

// Simple queue implementation to limit concurrent chunk processing
class ChunkProcessingQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = 0;
  private readonly maxConcurrent: number;

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.processing >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.processing++;
    const task = this.queue.shift();

    if (task) {
      try {
        await task();
      } finally {
        this.processing--;
        this.processNext();
      }
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getProcessingCount(): number {
    return this.processing;
  }
}

const chunkQueue = new ChunkProcessingQueue(3); // Reduced from 5 to 3 for memory

// Cleanup stale uploads every 30 minutes
setInterval(async () => {
  try {
    const service = new ChunkUploadService();
    const cleaned = await service.cleanupStaleUploads(2); // 2 hours old
    if (cleaned > 0) {
      logger.info(`Auto-cleanup: Removed ${cleaned} stale uploads`);
    }
  } catch (error) {
    logger.error('Error in auto-cleanup:', error);
  }
}, 30 * 60 * 1000);

export class ChunkUploadService {
  async handleChunkUpload(
    _userId: string,
    uploadId: string,
    chunkIndex: number,
    totalChunks: number,
    fileName: string,
    fileSize: number,
    mimeType: string,
    chunkBuffer: Buffer
  ): Promise<{
    success: boolean;
    chunkIndex: number;
    totalChunks: number;
    uploadedChunks: number;
    queueSize: number;
  }> {
    // Use queue to limit concurrent chunk processing
    return chunkQueue.add(async () => {
      try {
        if (!chunkStorage.uploadExists(uploadId)) {
          await chunkStorage.initializeUpload(
            uploadId,
            fileName,
            fileSize,
            mimeType,
            totalChunks
          );
        }

        await chunkStorage.saveChunk(uploadId, chunkIndex, chunkBuffer);

        const metadata = await chunkStorage.getMetadata(uploadId);

        logger.info(
          `Chunk ${chunkIndex}/${totalChunks} uploaded for ${uploadId} (${metadata.uploadedChunks.length}/${totalChunks} total) [Queue: ${chunkQueue.getQueueSize()}]`
        );

        return {
          success: true,
          chunkIndex,
          totalChunks,
          uploadedChunks: metadata.uploadedChunks.length,
          queueSize: chunkQueue.getQueueSize(),
        };
      } catch (error) {
        logger.error('Error handling chunk upload:', error);
        throw new ApiError(500, 'Failed to process chunk upload');
      }
    });
  }

  async finalizeUpload(
    userId: string,
    uploadId: string,
    fileName: string,
    fileSize: number,
    _mimeType: string,
    totalChunks: number
  ): Promise<{
    success: boolean;
    message: string;
    file: {
      id: string;
      name: string;
      size: number;
      format: string;
      createdAt: Date;
    };
  }> {
    // Queue finalization to prevent memory spikes from concurrent finalizations
    return chunkQueue.add(async () => {
      let assembledPath: string | null = null;
      
      try {
        if (!chunkStorage.uploadExists(uploadId)) {
          throw new ApiError(404, 'Upload not found');
        }

        const isComplete = await chunkStorage.isUploadComplete(uploadId);

        if (!isComplete) {
          const metadata = await chunkStorage.getMetadata(uploadId);
          throw new ApiError(
            400,
            `Upload incomplete: ${metadata.uploadedChunks.length}/${totalChunks} chunks received`
          );
        }

        logger.info(`Finalizing upload ${uploadId}, assembling ${totalChunks} chunks`);

        // Check quota before finalizing
        const canUpload = await canUploadFile(userId, fileSize);
        
        if (!canUpload) {
          throw new ApiError(400, 'Upload would exceed your storage quota');
        }

        // Stream chunks directly to bucket without loading into memory
        await ensureBucketExists();
        
        const fileLocation = generateFileLocation(userId, fileName);
        assembledPath = fileLocation;
        
        // Assemble directly to final location - NO MEMORY LOADING
        const actualSize = await chunkStorage.assembleChunksToFile(uploadId, fileLocation);

        // Create file record in database without loading file into memory
        const fileRepo = new FileRepository();
        
        const fileRecord = await fileRepo.create({
          name: fileName,
          location: fileLocation,
          size: actualSize,
          format: fileName.split('.').pop() || 'unknown',
        });

        // Link file to user
        await fileRepo.linkFileToUser(fileRecord.id, userId);

        // Clean up chunks
        await chunkStorage.cleanupUpload(uploadId);

        logger.info(`Successfully finalized upload ${uploadId} as file ${fileRecord.id} (${actualSize} bytes)`);

        return {
          success: true,
          message: 'File uploaded successfully',
          file: {
            id: fileRecord.id,
            name: fileRecord.name,
            size: fileRecord.size,
            format: fileRecord.format,
            createdAt: fileRecord.createdAt,
          },
        };
      } catch (error) {
        // Clean up assembled file on error
        if (assembledPath && require('fs').existsSync(assembledPath)) {
          await require('fs').promises.unlink(assembledPath);
        }
        
        if (error instanceof ApiError) throw error;
        logger.error('Error finalizing upload:', error);
        throw new ApiError(500, 'Failed to finalize upload');
      }
    });
  }

  async cancelUpload(uploadId: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!chunkStorage.uploadExists(uploadId)) {
        throw new ApiError(404, 'Upload not found');
      }

      await chunkStorage.cleanupUpload(uploadId);

      logger.info(`Canceled upload ${uploadId}`);

      return {
        success: true,
        message: 'Upload canceled successfully',
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error canceling upload:', error);
      throw new ApiError(500, 'Failed to cancel upload');
    }
  }

  async getUploadStatus(uploadId: string): Promise<{
    uploadId: string;
    fileName: string;
    fileSize: number;
    totalChunks: number;
    uploadedChunks: number[];
    isComplete: boolean;
    progress: number;
  }> {
    try {
      if (!chunkStorage.uploadExists(uploadId)) {
        throw new ApiError(404, 'Upload not found');
      }

      const metadata = await chunkStorage.getMetadata(uploadId);
      const isComplete = await chunkStorage.isUploadComplete(uploadId);

      return {
        uploadId: metadata.uploadId,
        fileName: metadata.fileName,
        fileSize: metadata.fileSize,
        totalChunks: metadata.totalChunks,
        uploadedChunks: metadata.uploadedChunks,
        isComplete,
        progress: (metadata.uploadedChunks.length / metadata.totalChunks) * 100,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error getting upload status:', error);
      throw new ApiError(500, 'Failed to get upload status');
    }
  }

  async cleanupStaleUploads(maxAgeHours: number = 24): Promise<number> {
    try {
      const cleanedCount = await chunkStorage.cleanupStaleUploads(maxAgeHours);
      logger.info(`Cleaned up ${cleanedCount} stale uploads`);
      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up stale uploads:', error);
      return 0;
    }
  }
}
