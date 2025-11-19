import { FileRepository } from '../repositories/file.repository';
import { UserRepository } from '../repositories/user.repository';
import {
  generateFileLocation,
  saveFile,
  readFile,
  deleteFile,
  fileExists,
  getFileExtension,
} from '../utils/storage.util';
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
}
