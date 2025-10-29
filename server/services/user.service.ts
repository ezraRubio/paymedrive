import { UserRepository } from '../repositories/user.repository';
import { getRemainingQuota } from '../utils/quota.util';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error-handler';

const userRepo = new UserRepository();

export class UserService {
  async getUserProfile(userId: string) {
    try {
      const user = await userRepo.findById(userId);

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const quota = await getRemainingQuota(userId);

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        tier: user.tier,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        quota: {
          used: quota.used,
          limit: quota.limit,
          remaining: quota.remaining,
          isUnlimited: quota.isUnlimited,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in getUserProfile:', error);
      throw new ApiError(500, 'Failed to retrieve user profile');
    }
  }

  async updateUserProfile(userId: string, data: { name?: string }) {
    try {
      const user = await userRepo.findById(userId);

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const updated = await userRepo.update(userId, data);

      if (!updated) {
        throw new ApiError(500, 'Failed to update user');
      }

      logger.info(`User profile updated: ${userId}`);

      return {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        tier: updated.tier,
        isAdmin: updated.isAdmin,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in updateUserProfile:', error);
      throw new ApiError(500, 'Failed to update user profile');
    }
  }

  async deleteUser(userId: string) {
    try {
      const user = await userRepo.findById(userId);

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const success = await userRepo.softDelete(userId);

      if (!success) {
        throw new ApiError(500, 'Failed to delete user');
      }

      logger.info(`User soft deleted: ${userId}`);

      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in deleteUser:', error);
      throw new ApiError(500, 'Failed to delete user');
    }
  }

  async getUserStats(userId: string) {
    try {
      const user = await userRepo.getUserWithFiles(userId);

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const totalFiles = await userRepo.getTotalFileCount(userId);
      const totalSize = await userRepo.getTotalFileSize(userId);
      const quota = await getRemainingQuota(userId);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          tier: user.tier,
        },
        stats: {
          totalFiles,
          totalSize,
          quota: {
            used: quota.used,
            limit: quota.limit,
            remaining: quota.remaining,
            isUnlimited: quota.isUnlimited,
          },
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in getUserStats:', error);
      throw new ApiError(500, 'Failed to retrieve user statistics');
    }
  }
}
