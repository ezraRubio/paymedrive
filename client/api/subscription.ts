import { apiClient } from './config';

export interface SubscriptionTier {
  tier: 'free' | 'pro' | 'unlimited';
  price: number;
  currency: string;
  billingPeriod: string;
  limitSize: number | null;
  limitItems: number | null;
}

export const subscriptionAPI = {
  getTiers: async (): Promise<{ success: boolean; tiers: SubscriptionTier[] }> => {
    const response = await apiClient.get('/subscription/tiers');
    return response.data;
  },

  upgradeTier: async (
    tier: 'free' | 'pro' | 'unlimited'
  ): Promise<{
    success: boolean;
    message: string;
    tier: string;
    transactionId?: string;
  }> => {
    const response = await apiClient.post('/subscription/upgrade', { tier });
    return response.data;
  },
};
