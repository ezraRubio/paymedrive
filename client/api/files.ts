import { Platform } from 'react-native';
import { apiClient } from './config';
import * as FileSystem from 'expo-file-system';
import { SelectedFile, prepareFileForUpload } from '../utils/fileUpload.util';
import { 
  uploadFileInChunks, 
  shouldUseChunkedUpload, 
  calculateOptimalChunkSize,
  ChunkUploadProgress 
} from '../utils/chunkedUpload.util';

export interface FileMetadata {
  id: string;
  name: string;
  size: number;
  format: string;
  createdAt: string;
  modifyAt: string;
}

export const filesAPI = {
  listFiles: async (): Promise<{
    success: boolean;
    count: number;
    files: FileMetadata[];
  }> => {
    const response = await apiClient.get('/files');
    return response.data;
  },

  uploadFile: async (
    selectedFile: SelectedFile,
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
  ): Promise<{ success: boolean; file: FileMetadata }> => {
    try {
      const { formData } = await prepareFileForUpload(selectedFile);

      const response = await apiClient.post('/file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentage = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress({
              loaded: progressEvent.loaded,
              total: progressEvent.total,
              percentage,
            });
          }
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error.response?.status === 413) {
        throw new Error('File is too large');
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timeout - file may be too large');
      }
      throw error;
    }
  },

  uploadFileChunked: async (
    selectedFile: SelectedFile,
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
  ): Promise<{ success: boolean; file: FileMetadata }> => {
    const chunkSize = calculateOptimalChunkSize(selectedFile.size);
    
    return uploadFileInChunks(selectedFile, {
      chunkSize,
      onProgress: (chunkProgress: ChunkUploadProgress) => {
        if (onProgress) {
          onProgress({
            loaded: chunkProgress.bytesUploaded,
            total: chunkProgress.totalBytes,
            percentage: chunkProgress.percentage,
          });
        }
      },
    });
  },

  smartUpload: async (
    selectedFile: SelectedFile,
    onProgress?: (progress: { loaded: number; total: number; percentage: number }) => void
  ): Promise<{ success: boolean; file: FileMetadata }> => {
    if (shouldUseChunkedUpload(selectedFile.size)) {
      console.log(`Using chunked upload for large file (${selectedFile.size} bytes)`);
      return filesAPI.uploadFileChunked(selectedFile, onProgress);
    } else {
      console.log(`Using standard upload for file (${selectedFile.size} bytes)`);
      return filesAPI.uploadFile(selectedFile, onProgress);
    }
  },

  downloadFile: async (
    fileId: string
  ): Promise<{ localUri: string; fileName: string }> => {
    const fileName = `file_${fileId}`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    if (Platform.OS === 'web') {
      const response = await apiClient.get(`/file?id=${fileId}`, {
        responseType: 'blob',
      });

      const extractedFileName = response.headers['content-disposition']
        ?.split('filename=')[1]
        ?.replace(/"/g, '') || fileName;

      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = extractedFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return { localUri: url, fileName: extractedFileName };
    } else {
      const response = await apiClient.get(`/file?id=${fileId}`, {
        responseType: 'arraybuffer',
      });

      const extractedFileName = response.headers['content-disposition']
        ?.split('filename=')[1]
        ?.replace(/"/g, '') || fileName;

      const finalUri = `${FileSystem.documentDirectory}${extractedFileName}`;
      
      const base64 = btoa(
        new Uint8Array(response.data).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ''
        )
      );

      await FileSystem.writeAsStringAsync(finalUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return { localUri: finalUri, fileName: extractedFileName };
    }
  },

  getFileMetadata: async (
    fileId: string
  ): Promise<{ success: boolean; file: FileMetadata }> => {
    const response = await apiClient.get(`/file/metadata?id=${fileId}`);
    return response.data;
  },

  deleteFile: async (
    fileId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/file?id=${fileId}`);
    return response.data;
  },
};
