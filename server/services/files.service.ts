import { FileRepository } from '../repositories/file.repository';
import { UserRepository } from '../repositories/user.repository';
import {
  generateFileLocation,
  saveFile,
  readFile,
  deleteFile,
  fileExists,
  getFileExtension,
  saveChunk,
  mergeChunks,
  deleteChunks,
} from '../utils/storage.util';
import { UploadSession, UploadStatus } from '../models/upload.session.model';
import { canUploadFile } from '../utils/quota.util';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error-handler';

const fileRepo = new FileRepository();
const userRepo = new UserRepository();

export class FileService {
  async uploadFile(
    userId: string,
    file: Express.Multer.File
  ): Promise<{
    id: string;
    name: string;
    size: number;
    format: string;
    createdAt: Date;
  }> {
    try {
      const user = await userRepo.findById(userId);

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const quotaCheck = await canUploadFile(userId, file.size);

      if (!quotaCheck.allowed) {
        throw new ApiError(403, quotaCheck.reason ?? 'Quota exceeded');
      }

      const location = generateFileLocation(userId, file.originalname);
      const format = getFileExtension(file.originalname);

      await saveFile(file.buffer, location);

      const fileRecord = await fileRepo.create({
        name: file.originalname,
        location,
        size: file.size,
        format,
      });

      await fileRepo.linkFileToUser(fileRecord.id, userId);

      logger.info(`File uploaded: ${fileRecord.id} by user ${userId}`);

      return {
        id: fileRecord.id,
        name: fileRecord.name,
        size: fileRecord.size,
        format: fileRecord.format,
        createdAt: fileRecord.createdAt,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in uploadFile:', error);
      throw new ApiError(500, 'Failed to upload file');
    }
  }

  async getFileById(
    userId: string,
    fileId: string
  ): Promise<{
    file: Buffer;
    name: string;
    format: string;
    size: number;
  }> {
    try {
      const fileRecord = await fileRepo.findById(fileId);

      if (!fileRecord) {
        throw new ApiError(404, 'File not found');
      }

      const hasAccess = await fileRepo.checkOwnership(fileId, userId);

      if (!hasAccess) {
        throw new ApiError(403, 'Access denied');
      }

      if (!fileExists(fileRecord.location)) {
        logger.error(`File not found on disk: ${fileRecord.location}`);
        throw new ApiError(404, 'File not found on storage');
      }

      const fileBuffer = await readFile(fileRecord.location);

      logger.info(`File downloaded: ${fileId} by user ${userId}`);

      return {
        file: fileBuffer,
        name: fileRecord.name,
        format: fileRecord.format,
        size: fileRecord.size,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in getFileById:', error);
      throw new ApiError(500, 'Failed to retrieve file');
    }
  }

  async listUserFiles(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      size: number;
      format: string;
      createdAt: Date;
      modifyAt: Date;
    }>
  > {
    try {
      const files = await fileRepo.findByUserId(userId);

      return files.map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        format: file.format,
        createdAt: file.createdAt,
        modifyAt: file.modifyAt,
      }));
    } catch (error) {
      logger.error('Error in listUserFiles:', error);
      throw new ApiError(500, 'Failed to list files');
    }
  }

  async deleteFile(
    userId: string,
    fileId: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const fileRecord = await fileRepo.findById(fileId);

      if (!fileRecord) {
        throw new ApiError(404, 'File not found');
      }

      const hasAccess = await fileRepo.checkOwnership(fileId, userId);

      if (!hasAccess) {
        throw new ApiError(403, 'Access denied');
      }

      await fileRepo.softDelete(fileId);

      if (fileExists(fileRecord.location)) {
        await deleteFile(fileRecord.location);
      }

      logger.info(`File deleted: ${fileId} by user ${userId}`);

      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in deleteFile:', error);
      throw new ApiError(500, 'Failed to delete file');
    }
  }

  async getFileMetadata(
    userId: string,
    fileId: string
  ): Promise<{
    id: string;
    name: string;
    size: number;
    format: string;
    createdAt: Date;
    modifyAt: Date;
  }> {
    try {
      const fileRecord = await fileRepo.findById(fileId);

      if (!fileRecord) {
        throw new ApiError(404, 'File not found');
      }

      const hasAccess = await fileRepo.checkOwnership(fileId, userId);

      if (!hasAccess) {
        throw new ApiError(403, 'Access denied');
      }

      return {
        id: fileRecord.id,
        name: fileRecord.name,
        size: fileRecord.size,
        format: fileRecord.format,
        createdAt: fileRecord.createdAt,
        modifyAt: fileRecord.modifyAt,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in getFileMetadata:', error);
      throw new ApiError(500, 'Failed to retrieve file metadata');
    }
  }
  async initiateUpload(
    userId: string,
    fileName: string,
    fileSize: number,
    mimeType: string
  ): Promise<{ sessionId: string; chunkSize: number }> {
    try {
      const user = await userRepo.findById(userId);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const quotaCheck = await canUploadFile(userId, fileSize);
      if (!quotaCheck.allowed) {
        throw new ApiError(403, quotaCheck.reason ?? 'Quota exceeded');
      }

      // Default chunk size: 5MB
      const CHUNK_SIZE = 5 * 1024 * 1024;
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

      const session = await UploadSession.create({
        userId,
        fileName,
        fileSize,
        mimeType,
        totalChunks,
        uploadedChunks: [],
        status: UploadStatus.PENDING,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiry
      });

      logger.info(`Upload session initiated: ${session.id} for user ${userId}`);

      return {
        sessionId: session.id,
        chunkSize: CHUNK_SIZE,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in initiateUpload:', error);
      throw new ApiError(500, 'Failed to initiate upload');
    }
  }

  async uploadChunk(
    userId: string,
    sessionId: string,
    chunkIndex: number,
    chunkBuffer: Buffer
  ): Promise<{ success: boolean; message: string }> {
    try {
      const session = await UploadSession.findOne({
        where: { id: sessionId, userId },
      });

      if (!session) {
        throw new ApiError(404, 'Upload session not found');
      }

      if (session.status !== UploadStatus.PENDING) {
        throw new ApiError(400, 'Upload session is not active');
      }

      if (new Date() > session.expiresAt) {
        session.status = UploadStatus.EXPIRED;
        await session.save();
        throw new ApiError(410, 'Upload session expired');
      }

      if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
        throw new ApiError(400, 'Invalid chunk index');
      }

      await saveChunk(sessionId, chunkIndex, chunkBuffer);

      if (!session.uploadedChunks.includes(chunkIndex)) {
        const updatedChunks = [...session.uploadedChunks, chunkIndex];
        session.uploadedChunks = updatedChunks;
        await session.save();
      }

      logger.info(`Chunk ${chunkIndex} uploaded for session ${sessionId}`);

      return {
        success: true,
        message: 'Chunk uploaded successfully',
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in uploadChunk:', error);
      throw new ApiError(500, 'Failed to upload chunk');
    }
  }

  async completeUpload(
    userId: string,
    sessionId: string
  ): Promise<{
    id: string;
    name: string;
    size: number;
    format: string;
    createdAt: Date;
  }> {
    try {
      const session = await UploadSession.findOne({
        where: { id: sessionId, userId },
      });

      if (!session) {
        throw new ApiError(404, 'Upload session not found');
      }

      if (session.status !== UploadStatus.PENDING) {
        throw new ApiError(400, 'Upload session is not active');
      }

      if (session.uploadedChunks.length !== session.totalChunks) {
        throw new ApiError(400, 'Not all chunks uploaded');
      }

      const location = generateFileLocation(userId, session.fileName);
      const format = getFileExtension(session.fileName);

      await mergeChunks(sessionId, session.totalChunks, location);

      const fileRecord = await fileRepo.create({
        name: session.fileName,
        location,
        size: session.fileSize,
        format,
      });

      await fileRepo.linkFileToUser(fileRecord.id, userId);

      session.status = UploadStatus.COMPLETED;
      await session.save();

      logger.info(`Upload completed: ${fileRecord.id} from session ${sessionId}`);

      return {
        id: fileRecord.id,
        name: fileRecord.name,
        size: fileRecord.size,
        format: fileRecord.format,
        createdAt: fileRecord.createdAt,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in completeUpload:', error);
      throw new ApiError(500, 'Failed to complete upload');
    }
  }

  async getUploadStatus(
    userId: string,
    sessionId: string
  ): Promise<{
    status: UploadStatus;
    uploadedChunks: number[];
    totalChunks: number;
  }> {
    try {
      const session = await UploadSession.findOne({
        where: { id: sessionId, userId },
      });

      if (!session) {
        throw new ApiError(404, 'Upload session not found');
      }

      return {
        status: session.status,
        uploadedChunks: session.uploadedChunks,
        totalChunks: session.totalChunks,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in getUploadStatus:', error);
      throw new ApiError(500, 'Failed to get upload status');
    }
  }

  async cancelUpload(userId: string, sessionId: string): Promise<void> {
    try {
      const session = await UploadSession.findOne({
        where: { id: sessionId, userId },
      });

      if (!session) {
        throw new ApiError(404, 'Upload session not found');
      }

      await deleteChunks(sessionId, session.totalChunks);
      await session.destroy();

      logger.info(`Upload session cancelled: ${sessionId}`);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in cancelUpload:', error);
      throw new ApiError(500, 'Failed to cancel upload');
    }
  }
}
