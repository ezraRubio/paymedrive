import { UserRepository } from '../repositories/user.repository';
import { SubscriptionService } from '../services/subscription.service';
import { UserTier } from '../models/user.model';

const userRepo = new UserRepository();
const subscriptionService = new SubscriptionService();

export interface QuotaInfo {
  used: {
    items: number;
    size: number;
  };
  limit: {
    items: number | null;
    size: number | null;
  };
  remaining: {
    items: number | null;
    size: number | null;
  };
  isUnlimited: boolean;
}

export const calculateUserUsage = async (
  userId: string
): Promise<{ itemCount: number; totalSize: number }> => {
  const itemCount = await userRepo.getTotalFileCount(userId);
  const totalSize = await userRepo.getTotalFileSize(userId);

  return { itemCount, totalSize };
};

export const canUploadFile = async (
  userId: string,
  fileSize: number
): Promise<{ allowed: boolean; reason?: string }> => {
  const user = await userRepo.findById(userId);
  
  if (!user) {
    return { allowed: false, reason: 'User not found' };
  }

  if (user.tier === UserTier.UNLIMITED) {
    return { allowed: true };
  }

  const { itemCount, totalSize } = await calculateUserUsage(userId);
  const limits = await subscriptionService.getSubscriptionLimits(user.tier);

  if (limits.limitItems !== null && itemCount >= limits.limitItems) {
    return {
      allowed: false,
      reason: `Item limit reached (${limits.limitItems} items)`,
    };
  }

  if (limits.limitSize !== null && totalSize + fileSize > limits.limitSize) {
    return {
      allowed: false,
      reason: `Storage limit exceeded (${limits.limitSize} bytes)`,
    };
  }

  return { allowed: true };
};

export const getRemainingQuota = async (userId: string): Promise<QuotaInfo> => {
  const user = await userRepo.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }

  const { itemCount, totalSize } = await calculateUserUsage(userId);
  const limits = await subscriptionService.getSubscriptionLimits(user.tier);

  const isUnlimited = user.tier === UserTier.UNLIMITED;

  return {
    used: {
      items: itemCount,
      size: totalSize,
    },
    limit: {
      items: limits.limitItems,
      size: limits.limitSize,
    },
    remaining: {
      items: isUnlimited ? null : limits.limitItems ? limits.limitItems - itemCount : null,
      size: isUnlimited ? null : limits.limitSize ? limits.limitSize - totalSize : null,
    },
    isUnlimited,
  };
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
