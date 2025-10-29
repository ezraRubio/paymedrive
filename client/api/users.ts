import { apiClient } from './config';

export interface User {
  id: string;
  name: string;
  email: string;
  tier: 'free' | 'pro' | 'unlimited';
  isAdmin: boolean;
  quota?: {
    used: {
      size: number;
      items: number;
    };
    remaining: {
      size: number | null;
      items: number | null;
    };
    limits: {
      size: number | null;
      items: number | null;
    };
    isUnlimited: boolean;
  };
}

export interface UserStats {
  user: User;
  stats: {
    totalFiles: number;
    totalSize: number;
    oldestFile?: Date;
    newestFile?: Date;
  };
  quota: any;
}

export const userAPI = {
  getProfile: async (): Promise<{ success: boolean; user: User }> => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  updateProfile: async (data: {
    name: string;
  }): Promise<{ success: boolean; user: User }> => {
    const response = await apiClient.put('/users', data);
    return response.data;
  },

  deleteAccount: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete('/users');
    return response.data;
  },

  getStats: async (): Promise<{ success: boolean; data: UserStats }> => {
    const response = await apiClient.get('/users/stats');
    return response.data;
  },

  checkQuota: async (): Promise<{
    success: boolean;
    isCompliant: boolean;
    currentUsage: any;
    limits: any;
  }> => {
    const response = await apiClient.get('/users/quota');
    return response.data;
  },
};
