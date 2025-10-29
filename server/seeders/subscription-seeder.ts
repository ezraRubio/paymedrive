import { Subscription } from '../models/subscription.model';
import { UserTier } from '../models/user.model';
import { logger } from '../utils/logger';

export const seedSubscriptions = async (): Promise<void> => {
  try {
    const existingCount = await Subscription.count();
    
    if (existingCount > 0) {
      logger.info('Subscriptions already seeded, skipping...');
      return;
    }

    const subscriptions = [
      {
        tier: UserTier.FREE,
        limitSize: 10485760,
        limitItems: 10,
      },
      {
        tier: UserTier.PRO,
        limitSize: 104857600,
        limitItems: 100,
      },
      {
        tier: UserTier.UNLIMITED,
        limitSize: null,
        limitItems: null,
      },
    ];

    await Subscription.bulkCreate(subscriptions);

    logger.info(`Seeded ${subscriptions.length} subscription tiers`);
  } catch (error) {
    logger.error('Error seeding subscriptions:', error);
    throw error;
  }
};
