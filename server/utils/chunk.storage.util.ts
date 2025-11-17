import fs from 'fs';
import path from 'path';
import { logger } from './logger';

const CHUNK_STORAGE_PATH = process.env.CHUNK_STORAGE_PATH || './chunks';

if (!fs.existsSync(CHUNK_STORAGE_PATH)) {
  fs.mkdirSync(CHUNK_STORAGE_PATH, { recursive: true });
}

export interface ChunkMetadata {
  uploadId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  uploadedChunks: number[];
  createdAt: Date;
  lastUpdatedAt: Date;
}

export class ChunkStorageUtil {
  private getUploadDirectory(uploadId: string): string {
    return path.join(CHUNK_STORAGE_PATH, uploadId);
  }

  private getMetadataPath(uploadId: string): string {
    return path.join(this.getUploadDirectory(uploadId), 'metadata.json');
  }

  private getChunkPath(uploadId: string, chunkIndex: number): string {
    return path.join(this.getUploadDirectory(uploadId), `chunk_${chunkIndex}`);
  }

  async initializeUpload(
    uploadId: string,
    fileName: string,
    fileSize: number,
    mimeType: string,
    totalChunks: number
  ): Promise<void> {
    const uploadDir = this.getUploadDirectory(uploadId);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const metadata: ChunkMetadata = {
      uploadId,
      fileName,
      fileSize,
      mimeType,
      totalChunks,
      uploadedChunks: [],
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
    };

    await fs.promises.writeFile(
      this.getMetadataPath(uploadId),
      JSON.stringify(metadata, null, 2)
    );

    logger.info(`Initialized chunk upload: ${uploadId} for file ${fileName}`);
  }

  async saveChunk(uploadId: string, chunkIndex: number, chunkBuffer: Buffer): Promise<void> {
    const chunkPath = this.getChunkPath(uploadId, chunkIndex);
    await fs.promises.writeFile(chunkPath, chunkBuffer);

    const metadata = await this.getMetadata(uploadId);
    if (!metadata.uploadedChunks.includes(chunkIndex)) {
      metadata.uploadedChunks.push(chunkIndex);
      metadata.uploadedChunks.sort((a, b) => a - b);
      metadata.lastUpdatedAt = new Date();
      
      await fs.promises.writeFile(
        this.getMetadataPath(uploadId),
        JSON.stringify(metadata, null, 2)
      );
    }

    logger.info(`Saved chunk ${chunkIndex}/${metadata.totalChunks} for upload ${uploadId}`);
  }

  async getMetadata(uploadId: string): Promise<ChunkMetadata> {
    const metadataPath = this.getMetadataPath(uploadId);
    
    if (!fs.existsSync(metadataPath)) {
      throw new Error(`Upload ${uploadId} not found`);
    }

    const data = await fs.promises.readFile(metadataPath, 'utf-8');
    return JSON.parse(data);
  }

  async isUploadComplete(uploadId: string): Promise<boolean> {
    const metadata = await this.getMetadata(uploadId);
    return metadata.uploadedChunks.length === metadata.totalChunks;
  }

  /**
   * Assemble chunks by streaming them directly to the final destination
   * Uses synchronous file operations in chunks to avoid memory issues
   */
  async assembleChunksToFile(uploadId: string, destinationPath: string): Promise<number> {
    const metadata = await this.getMetadata(uploadId);

    if (!await this.isUploadComplete(uploadId)) {
      throw new Error(
        `Upload incomplete: ${metadata.uploadedChunks.length}/${metadata.totalChunks} chunks uploaded`
      );
    }

    let totalBytesWritten = 0;

    try {
      // Open file for writing
      const fd = await fs.promises.open(destinationPath, 'w');
      
      try {
        // Read and write each chunk sequentially
        for (let i = 0; i < metadata.totalChunks; i++) {
          const chunkPath = this.getChunkPath(uploadId, i);
          
          if (!fs.existsSync(chunkPath)) {
            throw new Error(`Chunk ${i} missing for upload ${uploadId}`);
          }

          // Read chunk into buffer (one at a time)
          const chunkData = await fs.promises.readFile(chunkPath);
          
          // Write to destination
          await fd.write(chunkData, 0, chunkData.length, totalBytesWritten);
          totalBytesWritten += chunkData.length;
          
          // Free the buffer immediately
          // @ts-ignore - help GC
          chunkData = null;
        }
      } finally {
        // Always close the file descriptor
        await fd.close();
      }

      if (totalBytesWritten !== metadata.fileSize) {
        logger.warn(
          `File size mismatch for ${uploadId}: expected ${metadata.fileSize}, got ${totalBytesWritten}`
        );
      }

      logger.info(`Assembled ${metadata.totalChunks} chunks for upload ${uploadId} to ${destinationPath} (${totalBytesWritten} bytes)`);
      return totalBytesWritten;
    } catch (error) {
      // Clean up on error
      if (fs.existsSync(destinationPath)) {
        try {
          await fs.promises.unlink(destinationPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - loads entire file into memory
   * @deprecated Use assembleChunksToFile instead for better memory efficiency
   */
  async assembleChunks(uploadId: string): Promise<Buffer> {
    const tempPath = path.join(this.getUploadDirectory(uploadId), 'temp_assembled');
    
    await this.assembleChunksToFile(uploadId, tempPath);
    const buffer = await fs.promises.readFile(tempPath);
    await fs.promises.unlink(tempPath);
    
    return buffer;
  }

  async cleanupUpload(uploadId: string): Promise<void> {
    const uploadDir = this.getUploadDirectory(uploadId);

    if (fs.existsSync(uploadDir)) {
      await fs.promises.rm(uploadDir, { recursive: true, force: true });
      logger.info(`Cleaned up upload directory for ${uploadId}`);
    }
  }

  async listActiveUploads(): Promise<ChunkMetadata[]> {
    const uploads: ChunkMetadata[] = [];

    if (!fs.existsSync(CHUNK_STORAGE_PATH)) {
      return uploads;
    }

    const directories = await fs.promises.readdir(CHUNK_STORAGE_PATH);

    for (const dir of directories) {
      const metadataPath = path.join(CHUNK_STORAGE_PATH, dir, 'metadata.json');
      
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = await this.getMetadata(dir);
          uploads.push(metadata);
        } catch (error) {
          logger.error(`Error reading metadata for upload ${dir}:`, error);
        }
      }
    }

    return uploads;
  }

  async cleanupStaleUploads(maxAgeHours: number = 24): Promise<number> {
    const uploads = await this.listActiveUploads();
    const now = Date.now();
    let cleanedCount = 0;

    for (const upload of uploads) {
      const age = now - new Date(upload.lastUpdatedAt).getTime();
      const ageHours = age / (1000 * 60 * 60);

      if (ageHours > maxAgeHours) {
        await this.cleanupUpload(upload.uploadId);
        cleanedCount++;
        logger.info(`Cleaned up stale upload ${upload.uploadId} (age: ${ageHours.toFixed(1)}h)`);
      }
    }

    return cleanedCount;
  }

  uploadExists(uploadId: string): boolean {
    return fs.existsSync(this.getUploadDirectory(uploadId));
  }
}
