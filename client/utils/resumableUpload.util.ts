import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { apiClient } from '../api/config';
import { SelectedFile } from './fileUpload.util';
import { UploadStateManager, UploadState } from './uploadState.util';
import { 
  ChunkUploadProgress, 
  ChunkMetadata,
  calculateOptimalChunkSize 
} from './chunkedUpload.util';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const readFileChunk = async (
  uri: string,
  offset: number,
  length: number
): Promise<string> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    const chunk = blob.slice(offset, offset + length);
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(chunk);
    });
  } else {
    const base64Chunk = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      position: offset,
      length: length,
    });
    return base64Chunk;
  }
};

const uploadChunkWithRetry = async (
  formData: FormData,
  metadata: ChunkMetadata,
  retries: number = MAX_RETRIES
): Promise<any> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await apiClient.post('/file/chunk', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Upload-Id': metadata.uploadId,
          'X-Chunk-Index': metadata.chunkIndex.toString(),
          'X-Total-Chunks': metadata.totalChunks.toString(),
          'X-File-Name': metadata.fileName,
          'X-File-Size': metadata.fileSize.toString(),
          'X-Mime-Type': metadata.mimeType,
        },
        timeout: 60000,
      });
      
      return response.data;
    } catch (error: any) {
      lastError = error;
      console.error(`Chunk ${metadata.chunkIndex} upload attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt < retries - 1) {
        await delay(RETRY_DELAY * (attempt + 1));
      }
    }
  }
  
  throw lastError || new Error('Upload failed after retries');
};

export interface ResumableUploadOptions {
  chunkSize?: number;
  onProgress?: (progress: ChunkUploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  onPause?: () => void;
  onResume?: () => void;
  maxRetries?: number;
}

export class ResumableUpload {
  private uploadId: string;
  private selectedFile: SelectedFile;
  private options: ResumableUploadOptions;
  private isPaused: boolean = false;
  private isCancelled: boolean = false;
  private uploadedChunks: Set<number> = new Set();
  private chunkSize: number;

  constructor(uploadId: string, selectedFile: SelectedFile, options: ResumableUploadOptions = {}) {
    this.uploadId = uploadId;
    this.selectedFile = selectedFile;
    this.options = options;
    this.chunkSize = options.chunkSize || calculateOptimalChunkSize(selectedFile.size);
  }

  async start(): Promise<{ success: boolean; file: any }> {
    const { uri, name, size, mimeType } = this.selectedFile;
    const totalChunks = Math.ceil(size / this.chunkSize);

    const existingState = await UploadStateManager.getUploadState(this.uploadId);
    
    if (existingState && existingState.fileUri === uri) {
      console.log(`Resuming upload ${this.uploadId} with ${existingState.uploadedChunks.length}/${totalChunks} chunks already uploaded`);
      this.uploadedChunks = new Set(existingState.uploadedChunks);
      
      if (this.options.onResume) {
        this.options.onResume();
      }
    } else {
      const state: UploadState = {
        uploadId: this.uploadId,
        fileName: name,
        fileUri: uri,
        fileSize: size,
        mimeType,
        totalChunks,
        uploadedChunks: [],
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      };
      await UploadStateManager.saveUploadState(state);
    }

    let bytesUploaded = this.uploadedChunks.size * this.chunkSize;

    try {
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (this.isCancelled) {
          throw new Error('Upload cancelled');
        }

        while (this.isPaused) {
          await delay(100);
        }

        if (this.uploadedChunks.has(chunkIndex)) {
          console.log(`Skipping already uploaded chunk ${chunkIndex}`);
          continue;
        }

        const offset = chunkIndex * this.chunkSize;
        const length = Math.min(this.chunkSize, size - offset);
        
        const chunkBase64 = await readFileChunk(uri, offset, length);
        
        const formData = new FormData();
        
        if (Platform.OS === 'web') {
          const byteCharacters = atob(chunkBase64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'application/octet-stream' });
          formData.append('chunk', blob);
        } else {
          const tempUri = `${FileSystem.cacheDirectory}temp_chunk_${chunkIndex}`;
          await FileSystem.writeAsStringAsync(tempUri, chunkBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          formData.append('chunk', {
            uri: tempUri,
            name: `chunk_${chunkIndex}`,
            type: 'application/octet-stream',
          } as any);
        }

        const metadata: ChunkMetadata = {
          chunkIndex,
          totalChunks,
          fileName: name,
          fileSize: size,
          mimeType,
          uploadId: this.uploadId,
        };

        await uploadChunkWithRetry(formData, metadata, this.options.maxRetries);
        
        this.uploadedChunks.add(chunkIndex);
        await UploadStateManager.updateUploadedChunks(this.uploadId, chunkIndex);
        
        bytesUploaded += length;

        if (this.options.onChunkComplete) {
          this.options.onChunkComplete(chunkIndex, totalChunks);
        }

        if (this.options.onProgress) {
          this.options.onProgress({
            chunkIndex,
            totalChunks,
            bytesUploaded,
            totalBytes: size,
            percentage: Math.round((bytesUploaded / size) * 100),
            currentChunkProgress: 100,
          });
        }

        if (Platform.OS !== 'web') {
          const tempUri = `${FileSystem.cacheDirectory}temp_chunk_${chunkIndex}`;
          try {
            await FileSystem.deleteAsync(tempUri, { idempotent: true });
          } catch (error) {
            console.warn('Failed to delete temp chunk file:', error);
          }
        }
      }

      const finalizeResponse = await apiClient.post('/file/chunk/finalize', {
        uploadId: this.uploadId,
        fileName: name,
        fileSize: size,
        mimeType,
        totalChunks,
      });

      await UploadStateManager.removeUploadState(this.uploadId);

      return finalizeResponse.data;
    } catch (error: any) {
      console.error('Resumable upload failed:', error);
      
      if (!this.isCancelled && !this.isPaused) {
        try {
          await apiClient.delete(`/file/chunk/${this.uploadId}`);
          await UploadStateManager.removeUploadState(this.uploadId);
        } catch (cleanupError) {
          console.warn('Failed to cleanup failed upload:', cleanupError);
        }
      }
      
      throw error;
    }
  }

  pause(): void {
    this.isPaused = true;
    if (this.options.onPause) {
      this.options.onPause();
    }
    console.log(`Upload ${this.uploadId} paused`);
  }

  resume(): void {
    this.isPaused = false;
    if (this.options.onResume) {
      this.options.onResume();
    }
    console.log(`Upload ${this.uploadId} resumed`);
  }

  cancel(): void {
    this.isCancelled = true;
    console.log(`Upload ${this.uploadId} cancelled`);
  }

  getProgress(): number {
    const totalChunks = Math.ceil(this.selectedFile.size / this.chunkSize);
    return (this.uploadedChunks.size / totalChunks) * 100;
  }
}

export const createResumableUpload = (
  uploadId: string,
  selectedFile: SelectedFile,
  options: ResumableUploadOptions = {}
): ResumableUpload => {
  return new ResumableUpload(uploadId, selectedFile, options);
};
