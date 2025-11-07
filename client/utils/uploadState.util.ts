import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UploadState {
  uploadId: string;
  fileName: string;
  fileUri: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  uploadedChunks: number[];
  startedAt: string;
  lastUpdatedAt: string;
}

const UPLOAD_STATE_PREFIX = '@upload_state_';

export class UploadStateManager {
  private static getKey(uploadId: string): string {
    return `${UPLOAD_STATE_PREFIX}${uploadId}`;
  }

  static async saveUploadState(state: UploadState): Promise<void> {
    try {
      const key = this.getKey(state.uploadId);
      await AsyncStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save upload state:', error);
    }
  }

  static async getUploadState(uploadId: string): Promise<UploadState | null> {
    try {
      const key = this.getKey(uploadId);
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get upload state:', error);
      return null;
    }
  }

  static async removeUploadState(uploadId: string): Promise<void> {
    try {
      const key = this.getKey(uploadId);
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove upload state:', error);
    }
  }

  static async listPendingUploads(): Promise<UploadState[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const uploadKeys = keys.filter(key => key.startsWith(UPLOAD_STATE_PREFIX));
      
      if (uploadKeys.length === 0) {
        return [];
      }

      const states = await AsyncStorage.multiGet(uploadKeys);
      return states
        .map(([, value]) => value ? JSON.parse(value) : null)
        .filter((state): state is UploadState => state !== null);
    } catch (error) {
      console.error('Failed to list pending uploads:', error);
      return [];
    }
  }

  static async updateUploadedChunks(uploadId: string, chunkIndex: number): Promise<void> {
    try {
      const state = await this.getUploadState(uploadId);
      if (state) {
        if (!state.uploadedChunks.includes(chunkIndex)) {
          state.uploadedChunks.push(chunkIndex);
          state.uploadedChunks.sort((a, b) => a - b);
        }
        state.lastUpdatedAt = new Date().toISOString();
        await this.saveUploadState(state);
      }
    } catch (error) {
      console.error('Failed to update uploaded chunks:', error);
    }
  }

  static async clearOldUploads(maxAgeHours: number = 24): Promise<number> {
    try {
      const uploads = await this.listPendingUploads();
      const now = Date.now();
      let clearedCount = 0;

      for (const upload of uploads) {
        const age = now - new Date(upload.lastUpdatedAt).getTime();
        const ageHours = age / (1000 * 60 * 60);

        if (ageHours > maxAgeHours) {
          await this.removeUploadState(upload.uploadId);
          clearedCount++;
        }
      }

      return clearedCount;
    } catch (error) {
      console.error('Failed to clear old uploads:', error);
      return 0;
    }
  }
}
