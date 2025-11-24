import { Platform } from 'react-native';
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
    fileId: string,
    knownFileName?: string
  ): Promise<{ localUri: string; fileName: string }> => {

    if (Platform.OS === 'web') {
      // Direct download link with token in query param
      // We need to get the token from storage or context. 
      // Since this is an API module, we might need to access it via a getter or passed in.
      // However, apiClient has an interceptor that adds the token. We can extract it from there?
      // Or better, we can import AsyncStorage and get it.
      // But AsyncStorage is async.

      // Let's assume we can get the token from AsyncStorage.
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('authToken');

      if (!token) throw new Error('No auth token found');

      // Construct URL
      // We need the base URL. apiClient.defaults.baseURL might have it.
      const baseURL = apiClient.defaults.baseURL || 'http://localhost:3000/api';
      const url = `${baseURL}/file?id=${fileId}&token=${token}`;

      // Try using File System Access API (Chrome/Edge/Opera)
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: knownFileName || `file_${fileId}`,
          });

          const writable = await handle.createWritable();
          const response = await fetch(url);

          if (!response.body) throw new Error('No response body');

          await response.body.pipeTo(writable);
          return { localUri: url, fileName: knownFileName || `file_${fileId}` };
        } catch (err: any) {
          // If user cancelled, rethrow or handle
          if (err.name === 'AbortError') throw new Error('Download cancelled');
          console.warn('File System Access API failed, falling back to direct link:', err);
          // Fallback below
        }
      }

      // Fallback for Firefox/Safari or if API failed
      const link = document.createElement('a');
      link.href = url;
      // We can try to set download attribute, but for cross-origin it might be ignored.
      // However, the server sets Content-Disposition, so the browser should respect the filename.
      if (knownFileName) {
        link.setAttribute('download', knownFileName);
      }
      document.body.appendChild(link);
      link.click();
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
      return { localUri: url, fileName: knownFileName || `file_${fileId}` };
    } else {
      // Native implementation
      // Re-fetch for Native since we removed the common fetch
      const response = await apiClient.get(`/file?id=${fileId}`, {
        responseType: 'text', // Fetch as text (base64) for writeAsStringAsync? 
        // Or 'arraybuffer'?
        // Expo FileSystem expects string.
        // Let's stick to what was likely working or intended:
        // If the server returns binary, axios might try to parse it.
        // We should probably use FileSystem.downloadAsync for Native! It's much better.
      });

      const fileName = knownFileName || response.headers['content-disposition']
        ?.split('filename=')[1]
        ?.replace(/"/g, '') || `file_${fileId}`;

      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, response.data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return { localUri: fileUri, fileName };
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
