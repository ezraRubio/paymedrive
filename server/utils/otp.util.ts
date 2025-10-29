import crypto from 'crypto';
import { logger } from './logger';

export const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
export const TEST_OTP = process.env.TEST_OTP || '123456';

interface OTPEntry {
  otp: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
}

const otpStore = new Map<string, OTPEntry>();

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6');

export const generateOTP = (): string => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < OTP_LENGTH; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  
  return otp;
};

export const storeOTP = (email: string, otp: string): void => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
  
  const entry: OTPEntry = {
    otp,
    email,
    createdAt: now,
    expiresAt,
  };
  
  otpStore.set(email.toLowerCase(), entry);
  
  logger.info(`OTP stored for ${email}, expires at ${expiresAt.toISOString()}`);
};

export const verifyOTP = (email: string, otp: string): boolean => {
  const normalizedEmail = email.toLowerCase();
  const entry = otpStore.get(normalizedEmail);
  
  if (!entry) {
    logger.warn(`OTP verification failed: No OTP found for ${email}`);
    return false;
  }
  
  const now = new Date();
  
  if (now > entry.expiresAt) {
    logger.warn(`OTP verification failed: OTP expired for ${email}`);
    otpStore.delete(normalizedEmail);
    return false;
  }
  
  if (entry.otp !== otp) {
    logger.warn(`OTP verification failed: Invalid OTP for ${email}`);
    return false;
  }
  
  logger.info(`OTP verified successfully for ${email}`);
  otpStore.delete(normalizedEmail);
  return true;
};

export const clearOTP = (email: string): void => {
  otpStore.delete(email.toLowerCase());
};

export const cleanupExpiredOTPs = (): void => {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [email, entry] of otpStore.entries()) {
    if (entry.expiresAt < now) {
      otpStore.delete(email);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    logger.info(`Cleaned up ${cleanedCount} expired OTPs`);
  }
};

setInterval(() => {
  cleanupExpiredOTPs();
}, 60000);

export const getOTPStoreSize = (): number => {
  return otpStore.size;
};
