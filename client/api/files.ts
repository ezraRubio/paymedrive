import { apiClient } from './config';
import * as FileSystem from 'expo-file-system';

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
    file: File,
    // fileUri: string,
    // fileName: string
  ): Promise<{ success: boolean; file: FileMetadata }> => {
    const formData = new FormData();
    
    formData.append('file', file as any);

    const response = await apiClient.post('/file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  downloadFile: async (
    fileId: string
  ): Promise<{ localUri: string; fileName: string }> => {
    const response = await apiClient.get(`/file?id=${fileId}`, {
      responseType: 'blob',
    });

    const fileName = response.headers['content-disposition']
      ?.split('filename=')[1]
      ?.replace(/"/g, '') || `file_${fileId}`;

    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(fileUri, response.data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { localUri: fileUri, fileName };
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
