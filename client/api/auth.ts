import { apiClient } from './config';

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    tier: string;
    isAdmin: boolean;
  };
}

export const authAPI = {
  sendOTP: async (email: string): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth', { email });
    return response.data;
  },

  verifyOTP: async (
    email: string,
    otp: string,
    name?: string
  ): Promise<AuthResponse> => {
    const response = await apiClient.post('/otp', { email, otp, name });
    return response.data;
  },

  logout: async (): Promise<AuthResponse> => {
    const response = await apiClient.post('/logout');
    return response.data;
  },
};
