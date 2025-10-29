import { PaymentService } from '../../services/payment.service';
import { UserTier } from '../../models/user.model';

describe('PaymentService', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = new PaymentService();
  });

  describe('getSubscriptionPrice', () => {
    it('should return price for free tier', () => {
      const price = paymentService.getSubscriptionPrice(UserTier.FREE);

      expect(price).toBeDefined();
      expect(price?.tier).toBe(UserTier.FREE);
      expect(price?.price).toBe(0);
    });

    it('should return price for pro tier', () => {
      const price = paymentService.getSubscriptionPrice(UserTier.PRO);

      expect(price).toBeDefined();
      expect(price?.tier).toBe(UserTier.PRO);
      expect(price?.price).toBe(10);
    });

    it('should return price for unlimited tier', () => {
      const price = paymentService.getSubscriptionPrice(UserTier.UNLIMITED);

      expect(price).toBeDefined();
      expect(price?.tier).toBe(UserTier.UNLIMITED);
      expect(price?.price).toBe(0.5);
    });
  });

  describe('getAllPrices', () => {
    it('should return all subscription prices', () => {
      const prices = paymentService.getAllPrices();

      expect(prices).toHaveLength(3);
      expect(prices.map((p) => p.tier)).toContain(UserTier.FREE);
      expect(prices.map((p) => p.tier)).toContain(UserTier.PRO);
      expect(prices.map((p) => p.tier)).toContain(UserTier.UNLIMITED);
    });
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const result = await paymentService.processPayment('user123', UserTier.PRO, 10);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.transactionId).toContain('MOCK_TXN_');
    });

    it('should return transaction ID on success', async () => {
      const result = await paymentService.processPayment('user123', UserTier.PRO, 10);

      expect(result.transactionId).toMatch(/^MOCK_TXN_\d+_[A-Z0-9]+$/);
    });
  });

  describe('validatePayment', () => {
    it('should validate transaction with correct format', async () => {
      const result = await paymentService.processPayment('user123', UserTier.PRO, 10);
      const isValid = await paymentService.validatePayment(result.transactionId!);

      expect(isValid).toBe(true);
    });

    it('should reject invalid transaction ID', async () => {
      const isValid = await paymentService.validatePayment('INVALID_TXN');

      expect(isValid).toBe(false);
    });
  });

  describe('calculateUnlimitedCost', () => {
    it('should calculate cost for unlimited tier', () => {
      const sizeInBytes = 10 * 1024 * 1024; // 10MB
      const days = 30;

      const cost = paymentService.calculateUnlimitedCost(sizeInBytes, days);

      expect(cost).toBe(10 * 0.5 * 30); // 10MB * $0.5 * 30 days
    });

    it('should handle zero size', () => {
      const cost = paymentService.calculateUnlimitedCost(0, 30);

      expect(cost).toBe(0);
    });

    it('should handle zero days', () => {
      const sizeInBytes = 10 * 1024 * 1024;
      const cost = paymentService.calculateUnlimitedCost(sizeInBytes, 0);

      expect(cost).toBe(0);
    });
  });

  describe('refundPayment', () => {
    it('should process refund for valid transaction', async () => {
      const paymentResult = await paymentService.processPayment('user123', UserTier.PRO, 10);
      const refundResult = await paymentService.refundPayment(paymentResult.transactionId!);

      expect(refundResult.success).toBe(true);
      expect(refundResult.transactionId).toContain('REFUND_');
    });

    it('should reject refund for invalid transaction', async () => {
      const refundResult = await paymentService.refundPayment('INVALID_TXN');

      expect(refundResult.success).toBe(false);
    });
  });
});
