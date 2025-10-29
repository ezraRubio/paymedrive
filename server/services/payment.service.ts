import { UserTier } from '../models/user.model';
import { logger } from '../utils/logger';

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  message: string;
}

export interface SubscriptionPrice {
  tier: UserTier;
  price: number;
  currency: string;
  billingPeriod: string;
}

const SUBSCRIPTION_PRICES: SubscriptionPrice[] = [
  {
    tier: UserTier.FREE,
    price: 0,
    currency: 'USD',
    billingPeriod: 'lifetime',
  },
  {
    tier: UserTier.PRO,
    price: 10,
    currency: 'USD',
    billingPeriod: 'monthly',
  },
  {
    tier: UserTier.UNLIMITED,
    price: 0.5,
    currency: 'USD',
    billingPeriod: 'per MB per day',
  },
];

export class PaymentService {
  async processPayment(
    userId: string,
    tier: UserTier,
    amount: number
  ): Promise<PaymentResult> {
    try {
      logger.info(`Processing mock payment for user ${userId}, tier: ${tier}, amount: $${amount}`);

      await this.simulatePaymentDelay();

      const shouldFail = Math.random() < 0.05;

      if (shouldFail) {
        logger.warn(`Mock payment failed for user ${userId}`);
        return {
          success: false,
          message: 'Payment processing failed. Please try again.',
        };
      }

      const transactionId = this.generateMockTransactionId();

      logger.info(`Mock payment successful for user ${userId}, transaction: ${transactionId}`);

      return {
        success: true,
        transactionId,
        message: 'Payment processed successfully',
      };
    } catch (error) {
      logger.error('Error processing mock payment:', error);
      return {
        success: false,
        message: 'An error occurred during payment processing',
      };
    }
  }

  getSubscriptionPrice(tier: UserTier): SubscriptionPrice | null {
    return SUBSCRIPTION_PRICES.find((price) => price.tier === tier) || null;
  }

  getAllPrices(): SubscriptionPrice[] {
    return SUBSCRIPTION_PRICES;
  }

  async validatePayment(transactionId: string): Promise<boolean> {
    await this.simulatePaymentDelay(500);
    
    return transactionId.startsWith('MOCK_TXN_');
  }

  async refundPayment(transactionId: string): Promise<PaymentResult> {
    try {
      logger.info(`Processing mock refund for transaction ${transactionId}`);

      await this.simulatePaymentDelay();

      const isValid = await this.validatePayment(transactionId);

      if (!isValid) {
        return {
          success: false,
          message: 'Invalid transaction ID',
        };
      }

      logger.info(`Mock refund successful for transaction ${transactionId}`);

      return {
        success: true,
        transactionId: `REFUND_${transactionId}`,
        message: 'Refund processed successfully',
      };
    } catch (error) {
      logger.error('Error processing mock refund:', error);
      return {
        success: false,
        message: 'An error occurred during refund processing',
      };
    }
  }

  private generateMockTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `MOCK_TXN_${timestamp}_${random}`;
  }

  private async simulatePaymentDelay(ms = 1000): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  calculateUnlimitedCost(sizeInBytes: number, days: number): number {
    const sizeInMB = sizeInBytes / (1024 * 1024);
    const dailyCost = sizeInMB * 0.5;
    return dailyCost * days;
  }
}
