import { UserRepository } from '../repositories/user.repository';
import { SubscriptionService } from '../repositories/subscription.repository';
import { PaymentService } from './payment.service';
import { getRemainingQuota } from '../utils/quota.util';
import { logger } from '../utils/logger';
import { UserTier } from '../models/user.model';
import { ApiError } from '../middleware/error-handler';

const userRepo = new UserRepository();
const subscriptionService = new SubscriptionService();
const paymentService = new PaymentService();

export class SubscriptionManagerService {
  async upgradeTier(userId: string, newTier: UserTier) {
    try {
      const user = await userRepo.findById(userId);

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      if (user.tier === newTier) {
        throw new ApiError(400, 'User is already on this tier');
      }

      const tierOrder = [UserTier.FREE, UserTier.PRO, UserTier.UNLIMITED];
      const currentIndex = tierOrder.indexOf(user.tier);
      const newIndex = tierOrder.indexOf(newTier);

      if (newIndex < currentIndex) {
        throw new ApiError(400, 'Cannot downgrade tier. Please contact support.');
      }

      if (newTier !== UserTier.FREE) {
        const price = paymentService.getSubscriptionPrice(newTier);

        if (!price) {
          throw new ApiError(400, 'Invalid tier');
        }

        const paymentResult = await paymentService.processPayment(userId, newTier, price.price);

        if (!paymentResult.success) {
          throw new ApiError(402, paymentResult.message);
        }

        logger.info(`Payment successful for user ${userId}: ${paymentResult.transactionId}`);
      }

      await subscriptionService.assignSubscriptionToUser(userId, newTier);
      await userRepo.update(userId, { tier: newTier });

      logger.info(`User ${userId} upgraded to ${newTier}`);

      return {
        success: true,
        message: `Successfully upgraded to ${newTier} tier`,
        tier: newTier,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in upgradeTier:', error);
      throw new ApiError(500, 'Failed to upgrade subscription');
    }
  }

  async getAvailableTiers() {
    const subscriptions = await subscriptionService.getAllSubscriptions();
    const prices = paymentService.getAllPrices();

    return subscriptions.map((sub) => {
      const priceInfo = prices.find((p) => p.tier === sub.tier);

      return {
        tier: sub.tier,
        price: priceInfo?.price ?? 0,
        currency: priceInfo?.currency ?? 'USD',
        billingPeriod: priceInfo?.billingPeriod ?? 'lifetime',
        limitSize: sub.limitSize,
        limitItems: sub.limitItems,
      };
    });
  }

  async checkQuotaCompliance(userId: string) {
    try {
      const user = await userRepo.findById(userId);

      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      const quota = await getRemainingQuota(userId);
      const limits = await subscriptionService.getSubscriptionLimits(user.tier);

      const isCompliant =
        quota.isUnlimited ||
        (quota.used.items <= (limits.limitItems ?? Infinity) &&
          quota.used.size <= (limits.limitSize ?? Infinity));

      return {
        isCompliant,
        currentUsage: quota.used,
        limits: {
          items: limits.limitItems,
          size: limits.limitSize,
        },
        exceededBy: isCompliant
          ? null
          : {
              items:
                limits.limitItems !== null ? Math.max(0, quota.used.items - limits.limitItems) : 0,
              size: limits.limitSize !== null ? Math.max(0, quota.used.size - limits.limitSize) : 0,
            },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error in checkQuotaCompliance:', error);
      throw new ApiError(500, 'Failed to check quota compliance');
    }
  }
}
