import { apiClient } from './config';
import { FileMetadata } from './files';
import { Platform } from 'react-native';

export interface UploadSession {
    sessionId: string;
    chunkSize: number;
}

export interface UploadStatus {
    status: 'pending' | 'completed' | 'expired';
    uploadedChunks: number[];
    totalChunks: number;
}

export const uploadAPI = {
    initiateUpload: async (
        fileName: string,
        fileSize: number,
        mimeType: string
    ): Promise<UploadSession> => {
        const response = await apiClient.post('/upload/init', {
            fileName,
            fileSize,
            mimeType,
        });
        return response.data;
    },

    uploadChunk: async (
        sessionId: string,
        chunk: string, // Base64 encoded chunk
        index: number
    ): Promise<{ success: boolean; message: string }> => {
        const formData = new FormData();

        // We need to convert base64 to a blob/file for FormData
        // But React Native's FormData handles { uri, name, type } object for files
        // However, since we are reading chunks as strings (base64) using expo-file-system,
        // we might need a different approach or send it as a JSON field if the server supports it.
        // BUT, our server expects multipart/form-data with a file field.
        // In React Native, we can append a file like object:
        // formData.append('chunk', { uri: '...', name: 'blob', type: 'application/octet-stream' });
        // But we don't have a URI for the chunk, we have the content.

        // Actually, expo-file-system readAsStringAsync returns the content.
        // If we want to upload it as a file, we might need to write it to a temp file first?
        // OR, we can change the server to accept base64 string in JSON body for chunks.
        // Changing server to accept base64 in JSON is easier for React Native if we already have the string.
        // BUT, for large chunks (5MB), base64 overhead (33%) is significant.

        // Better approach for React Native:
        // Use `FileSystem.uploadAsync` for chunks?
        // `uploadAsync` takes a file URI. We can't easily upload a "slice" of a file with `uploadAsync` unless we split the file on disk first.

        // Splitting file on disk:
        // We can use `FileSystem.readAsStringAsync` with `position` and `length` to read a chunk.
        // Then write that chunk to a temporary file.
        // Then upload that temporary file using `FormData` or `FileSystem.uploadAsync`.
        // Then delete the temp file.
        // This seems robust.

        // So, `uploadChunk` here will expect a URI to the temporary chunk file.

        // Wait, the argument `chunk` in my plan was "string". I should change it to `chunkUri`.

        // Let's assume the caller (UploadManager) handles creating the temp chunk file.

        // formData.append('chunk', { uri: chunkUri, name: 'chunk', type: 'application/octet-stream' } as any);

        // Re-evaluating:
        // If I change the server to accept base64, I avoid temp file creation but incur network overhead.
        // If I use temp files, I incur disk I/O overhead but standard upload.

        // Given the requirement for "gigabytes", minimizing memory usage is key.
        // Reading 5MB into memory (base64 string) is fine.
        // Writing it back to disk is extra I/O.

        // Is there a way to upload a Blob from a byte array in RN?
        // fetch() supports Blob body.
        // But we are using axios (apiClient).

        // Let's stick to the plan: UploadManager reads chunk, writes to temp file, uploads temp file.
        // So this API method should take `chunkUri`.

        return Promise.reject(new Error("Not implemented"));
    },

    // Revised uploadChunk signature
    uploadChunkFile: async (
        sessionId: string,
        chunk: string | any, // string (URI) for Native, Blob for Web
        index: number
    ): Promise<{ success: boolean; message: string }> => {
        const formData = new FormData();

        formData.append('sessionId', sessionId);
        formData.append('index', index.toString());

        if (Platform.OS === 'web') {
            // On Web, append the Blob directly
            formData.append('chunk', chunk, 'chunk');
        } else {
            // On Native, append the file object with URI
            formData.append('chunk', {
                uri: chunk,
                name: 'chunk',
                type: 'application/octet-stream',
            } as any);
        }

        const response = await apiClient.post('/upload/chunk', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return response.data;
    },

    completeUpload: async (sessionId: string): Promise<FileMetadata> => {
        const response = await apiClient.post('/upload/complete', {
            sessionId,
        });
        return response.data.file;
    },

    getUploadStatus: async (sessionId: string): Promise<UploadStatus> => {
        const response = await apiClient.get(`/upload/${sessionId}`);
        return response.data;
    },

    cancelUpload: async (sessionId: string): Promise<void> => {
        await apiClient.delete(`/upload/${sessionId}`);
    },
};
