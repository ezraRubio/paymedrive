import { FileService } from './files.service';
import { ChunkStorageUtil } from '../utils/chunk.storage.util';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error-handler';

const chunkStorage = new ChunkStorageUtil();
const fileService = new FileService();

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
  }> {
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
        `Chunk ${chunkIndex}/${totalChunks} uploaded for ${uploadId} (${metadata.uploadedChunks.length}/${totalChunks} total)`
      );

      return {
        success: true,
        chunkIndex,
        totalChunks,
        uploadedChunks: metadata.uploadedChunks.length,
      };
    } catch (error) {
      logger.error('Error handling chunk upload:', error);
      throw new ApiError(500, 'Failed to process chunk upload');
    }
  }

  async finalizeUpload(
    userId: string,
    uploadId: string,
    fileName: string,
    _fileSize: number,
    mimeType: string,
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

      const assembledBuffer = await chunkStorage.assembleChunks(uploadId);

      const mockFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: fileName,
        encoding: '7bit',
        mimetype: mimeType,
        size: assembledBuffer.length,
        buffer: assembledBuffer,
        stream: null as any,
        destination: '',
        filename: fileName,
        path: '',
      };

      const uploadedFile = await fileService.uploadFile(userId, mockFile);

      await chunkStorage.cleanupUpload(uploadId);

      logger.info(`Successfully finalized upload ${uploadId} as file ${uploadedFile.id}`);

      return {
        success: true,
        message: 'File uploaded successfully',
        file: uploadedFile,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error finalizing upload:', error);
      throw new ApiError(500, 'Failed to finalize upload');
    }
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
