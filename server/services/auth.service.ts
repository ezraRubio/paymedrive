import { UserRepository } from '../repositories/user.repository';
import { SubscriptionService } from '../repositories/subscription.repository';
import { generateOTP, storeOTP, TEST_EMAIL, TEST_OTP, verifyOTP } from '../utils/otp.util';
import { generateToken } from '../utils/jwt.util';
import { sendOTPEmail } from '../clients/email.handler';
import { logger } from '../utils/logger';
import { UserTier } from '../models/user.model';

const userRepo = new UserRepository();
const subscriptionService = new SubscriptionService();

export class AuthService {
  async initiateAuth(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      const otp = generateOTP();

      if (normalizedEmail !== TEST_EMAIL) {
        storeOTP(normalizedEmail, otp);
        const emailSent = await sendOTPEmail(normalizedEmail, otp);

        if (!emailSent) {
          logger.error(`Failed to send OTP email to ${normalizedEmail}`);
          return {
            success: false,
            message: 'Failed to send OTP email. Please try again.',
          };
        }
      }

      logger.info(`OTP sent to ${normalizedEmail}`);

      return {
        success: true,
        message: 'OTP sent successfully. Please check your email.',
      };
    } catch (error) {
      logger.error('Error in initiateAuth:', error);
      return {
        success: false,
        message: 'An error occurred. Please try again.',
      };
    }
  }

  async verifyOTPAndLogin(
    email: string,
    otp: string,
    name?: string
  ): Promise<{
    success: boolean;
    message: string;
    token?: string;
    user?: any;
  }> {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      let isValid: boolean;

      if (normalizedEmail === TEST_EMAIL && otp === TEST_OTP) {
        isValid = true;
      } else {
        isValid = verifyOTP(normalizedEmail, otp);
      }

      if (!isValid) {
        return {
          success: false,
          message: 'Invalid or expired OTP',
        };
      }

      let user = await userRepo.findByEmail(normalizedEmail);

      if (!user) {
        user = await userRepo.create({
          name: name || normalizedEmail, 
          email: normalizedEmail,
          tier: UserTier.FREE,
        });

        await subscriptionService.assignSubscriptionToUser(user.id, UserTier.FREE);

        logger.info(`New user created: ${user.id} (${normalizedEmail})`);
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        tier: user.tier,
      });

      await userRepo.update(user.id, { accessToken: token });

      logger.info(`User authenticated successfully: ${user.id}`);

      return {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          tier: user.tier,
          isAdmin: user.isAdmin,
        },
      };
    } catch (error) {
      logger.error('Error in verifyOTPAndLogin:', error);
      return {
        success: false,
        message: 'An error occurred during authentication',
      };
    }
  }

  async logout(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      await userRepo.update(userId, { accessToken: null });

      logger.info(`User logged out: ${userId}`);

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      logger.error('Error in logout:', error);
      return {
        success: false,
        message: 'An error occurred during logout',
      };
    }
  }
}
