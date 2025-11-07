import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';

export interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const selectFile = async (): Promise<SelectedFile | null> => {
  try {
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '*/*';
        
        input.onchange = (e: Event) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          
          if (!file) {
            resolve(null);
            return;
          }
          
          const uri = URL.createObjectURL(file);
          
          resolve({
            uri,
            name: file.name,
            size: file.size,
            mimeType: file.type || 'application/octet-stream',
          });
        };
        
        input.oncancel = () => {
          resolve(null);
        };
        
        input.click();
      });
    } else {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return null;
      }

      const asset = result.assets[0];
      
      return {
        uri: asset.uri,
        name: asset.name,
        size: asset.size || 0,
        mimeType: asset.mimeType || 'application/octet-stream',
      };
    }
  } catch (error) {
    console.error('Error selecting file:', error);
    throw new Error('Failed to select file');
  }
};

export const prepareFileForUpload = async (
  selectedFile: SelectedFile
): Promise<{ formData: FormData; file: File } | { formData: FormData; fileInfo: SelectedFile }> => {
  if (Platform.OS === 'web') {
    const response = await fetch(selectedFile.uri);
    const blob = await response.blob();
    const file = new File([blob], selectedFile.name, { 
      type: selectedFile.mimeType 
    });
    
    const formData = new FormData();
    formData.append('file', file as any);
    
    return { formData, file };
  } else {
    const formData = new FormData();
    
    formData.append('file', {
      uri: selectedFile.uri,
      name: selectedFile.name,
      type: selectedFile.mimeType,
    } as any);
    
    return { formData, fileInfo: selectedFile };
  }
};

export const readFileAsBase64 = async (uri: string): Promise<string> => {
  try {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    }
  } catch (error) {
    console.error('Error reading file as base64:', error);
    throw new Error('Failed to read file');
  }
};

export const getFileInfo = async (uri: string): Promise<FileSystem.FileInfo> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(uri);
    return fileInfo;
  } catch (error) {
    console.error('Error getting file info:', error);
    throw new Error('Failed to get file information');
  }
};

export const validateFileSize = (size: number, maxSize: number): boolean => {
  return size <= maxSize;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export const getMimeTypeFromExtension = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  const mimeTypes: { [key: string]: string } = {
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'csv': 'text/csv',
    
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'bmp': 'image/bmp',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'heic': 'image/heic',
    'heif': 'image/heif',
    
    // Video
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'webm': 'video/webm',
    
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'flac': 'audio/flac',
    
    // Archives
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
};
