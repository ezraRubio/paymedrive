import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import crypto from 'crypto';

const BUCKET_PATH = process.env.BUCKET_PATH || './bucket';

export const ensureBucketExists = (): void => {
  if (!fs.existsSync(BUCKET_PATH)) {
    fs.mkdirSync(BUCKET_PATH, { recursive: true });
    logger.info(`Bucket directory created: ${BUCKET_PATH}`);
  }
};

export const generateFileLocation = (userId: string, originalName: string): string => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalName);
  const filename = `${userId}_${timestamp}_${random}${ext}`;
  return path.join(BUCKET_PATH, filename);
};

export const saveFile = async (buffer: Buffer, location: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.writeFile(location, buffer, (err) => {
      if (err) {
        logger.error('Error saving file:', err);
        reject(err);
      } else {
        logger.info(`File saved: ${location}`);
        resolve();
      }
    });
  });
};

export const readFile = async (location: string): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    fs.readFile(location, (err, data) => {
      if (err) {
        logger.error('Error reading file:', err);
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

export const deleteFile = async (location: string): Promise<boolean> => {
  return new Promise((resolve) => {
    fs.unlink(location, (err) => {
      if (err) {
        logger.error('Error deleting file:', err);
        resolve(false);
      } else {
        logger.info(`File deleted: ${location}`);
        resolve(true);
      }
    });
  });
};

export const fileExists = (location: string): boolean => {
  return fs.existsSync(location);
};

export const getFileSize = (location: string): number => {
  try {
    const stats = fs.statSync(location);
    return stats.size;
  } catch (error) {
    logger.error('Error getting file size:', error);
    return 0;
  }
};

export const getFileExtension = (filename: string): string => {
  return path.extname(filename).toLowerCase().substring(1);
};

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
};

export const getBucketPath = (): string => {
  return BUCKET_PATH;
};

ensureBucketExists();
