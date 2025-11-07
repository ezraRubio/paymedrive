import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { apiClient } from '../api/config';
import { SelectedFile } from './fileUpload.util';

const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export interface ChunkUploadProgress {
  chunkIndex: number;
  totalChunks: number;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  currentChunkProgress: number;
}

export interface ChunkUploadOptions {
  chunkSize?: number;
  onProgress?: (progress: ChunkUploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
  maxRetries?: number;
}

export interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadId: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateUploadId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

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
        timeout: 60000, // 1 minute per chunk
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

export const uploadFileInChunks = async (
  selectedFile: SelectedFile,
  options: ChunkUploadOptions = {}
): Promise<{ success: boolean; file: any }> => {
  const {
    chunkSize = DEFAULT_CHUNK_SIZE,
    onProgress,
    onChunkComplete,
    maxRetries = MAX_RETRIES,
  } = options;

  const { uri, name, size, mimeType } = selectedFile;
  const totalChunks = Math.ceil(size / chunkSize);
  const uploadId = generateUploadId();
  
  let bytesUploaded = 0;

  try {
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const offset = chunkIndex * chunkSize;
      const length = Math.min(chunkSize, size - offset);
      
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
        uploadId,
      };

      await uploadChunkWithRetry(formData, metadata, maxRetries);
      
      bytesUploaded += length;

      if (onChunkComplete) {
        onChunkComplete(chunkIndex, totalChunks);
      }

      if (onProgress) {
        onProgress({
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
      uploadId,
      fileName: name,
      fileSize: size,
      mimeType,
      totalChunks,
    });

    return finalizeResponse.data;
  } catch (error: any) {
    console.error('Chunked upload failed:', error);
    
    try {
      await apiClient.delete(`/file/chunk/${uploadId}`);
    } catch (cleanupError) {
      console.warn('Failed to cleanup failed upload:', cleanupError);
    }
    
    throw error;
  }
};

export const shouldUseChunkedUpload = (fileSize: number): boolean => {
  const CHUNK_THRESHOLD = 10 * 1024 * 1024; // 10MB
  return fileSize > CHUNK_THRESHOLD;
};

export const calculateOptimalChunkSize = (fileSize: number): number => {
  if (fileSize < 10 * 1024 * 1024) {
    return 1 * 1024 * 1024; // 1MB for files under 10MB
  } else if (fileSize < 100 * 1024 * 1024) {
    return 2 * 1024 * 1024; // 2MB for files under 100MB
  } else if (fileSize < 500 * 1024 * 1024) {
    return 5 * 1024 * 1024; // 5MB for files under 500MB
  } else {
    return 10 * 1024 * 1024; // 10MB for larger files
  }
};
