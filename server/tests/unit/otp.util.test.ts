import {
  generateOTP,
  storeOTP,
  verifyOTP,
  clearOTP,
  getOTPStoreSize,
} from '../../utils/otp.util';

describe('OTP Utility', () => {
  beforeEach(() => {
    const emails = ['test1@example.com', 'test2@example.com'];
    emails.forEach((email) => clearOTP(email));
  });

  describe('generateOTP', () => {
    it('should generate a 6-digit OTP', () => {
      const otp = generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
    });

    it('should generate unique OTPs', () => {
      const otp1 = generateOTP();
      const otp2 = generateOTP();
      expect(otp1).not.toBe(otp2);
    });
  });

  describe('storeOTP', () => {
    it('should store OTP for an email', () => {
      const email = 'test@example.com';
      const otp = '123456';

      storeOTP(email, otp);

      expect(getOTPStoreSize()).toBeGreaterThan(0);
    });

    it('should normalize email to lowercase', () => {
      const email = 'TEST@EXAMPLE.COM';
      const otp = '123456';

      storeOTP(email, otp);

      const isValid = verifyOTP('test@example.com', otp);
      expect(isValid).toBe(true);
    });
  });

  describe('verifyOTP', () => {
    it('should verify correct OTP', () => {
      const email = 'test@example.com';
      const otp = '123456';

      storeOTP(email, otp);
      const isValid = verifyOTP(email, otp);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect OTP', () => {
      const email = 'test@example.com';
      const otp = '123456';

      storeOTP(email, otp);
      const isValid = verifyOTP(email, '654321');

      expect(isValid).toBe(false);
    });

    it('should reject OTP for non-existent email', () => {
      const isValid = verifyOTP('nonexistent@example.com', '123456');
      expect(isValid).toBe(false);
    });

    it('should remove OTP after successful verification', () => {
      const email = 'test@example.com';
      const otp = '123456';

      storeOTP(email, otp);
      verifyOTP(email, otp);

      const isValidAgain = verifyOTP(email, otp);
      expect(isValidAgain).toBe(false);
    });
  });

  describe('clearOTP', () => {
    it('should clear OTP for an email', () => {
      const email = 'test@example.com';
      const otp = '123456';

      storeOTP(email, otp);
      clearOTP(email);

      const isValid = verifyOTP(email, otp);
      expect(isValid).toBe(false);
    });
  });
});
