import { Subscription, UserSubscription } from '../models';
import { UserTier } from '../models/user.model';
import { logger } from '../utils/logger';

export class SubscriptionService {
  async getSubscriptionByTier(tier: UserTier): Promise<Subscription | null> {
    return await Subscription.findOne({ where: { tier } });
  }

  async assignSubscriptionToUser(userId: string, tier: UserTier): Promise<void> {
    const subscription = await this.getSubscriptionByTier(tier);
    
    if (!subscription) {
      throw new Error(`Subscription tier ${tier} not found`);
    }

    const existing = await UserSubscription.findOne({ where: { userId } });
    
    if (existing) {
      await existing.update({ subscriptionId: subscription.id });
      logger.info(`Updated subscription for user ${userId} to ${tier}`);
    } else {
      await UserSubscription.create({
        userId,
        subscriptionId: subscription.id,
      });
      logger.info(`Assigned subscription ${tier} to user ${userId}`);
    }
  }

  async getUserSubscription(userId: string): Promise<Subscription | null> {
    const userSub = await UserSubscription.findOne({
      where: { userId },
      include: [{ model: Subscription, as: 'subscription' }],
    });

    if (!userSub) return null;

    return await Subscription.findByPk(userSub.subscriptionId);
  }

  async getSubscriptionLimits(tier: UserTier): Promise<{
    limitSize: number | null;
    limitItems: number | null;
  }> {
    const subscription = await this.getSubscriptionByTier(tier);
    
    if (!subscription) {
      throw new Error(`Subscription tier ${tier} not found`);
    }

    return {
      limitSize: subscription.limitSize,
      limitItems: subscription.limitItems,
    };
  }

  async getAllSubscriptions(): Promise<Subscription[]> {
    return await Subscription.findAll({
      order: [
        ['tier', 'ASC']
      ]
    });
  }
}
