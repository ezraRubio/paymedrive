import multer from 'multer';
import { Request } from 'express';
import { logger } from '../utils/logger';
import { sanitizeFilename } from '../utils/storage.util';

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600');

const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const sanitized = sanitizeFilename(file.originalname);
  file.originalname = sanitized;

  logger.info(`File upload initiated: ${file.originalname}, size: ${file.size ?? 'unknown'}`);
  cb(null, true);
};

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
});

export const handleMulterError = (error: Error | multer.MulterError): string => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
      case 'LIMIT_FILE_COUNT':
        return 'Too many files uploaded';
      case 'LIMIT_UNEXPECTED_FILE':
        return 'Unexpected file field';
      default:
        return `Upload error: ${error.message}`;
    }
  }
  if (error instanceof Error) {
    return `Upload error: ${error.message}`;
  }
  return 'File upload failed';
};
