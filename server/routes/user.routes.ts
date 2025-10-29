import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { SubscriptionManagerService } from '../services/subscription-manager.service';
import {
  initiateAuthSchema,
  verifyOTPSchema,
  updateUserSchema,
  validate,
} from '../utils/validations/user.validation';
import { otpRateLimit, authRateLimit } from '../middleware/rate-limit.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { ApiError } from '../middleware/error-handler';
import { ExtendedRequest } from '../types/extended.request';

const router = Router();
const authService = new AuthService();
const userService = new UserService();
const subscriptionManager = new SubscriptionManagerService();

/**
 * @swagger
 * /api/auth:
 *   post:
 *     summary: Initiate authentication (send OTP)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid email
 *       429:
 *         description: Too many requests
 */
router.post('/auth', otpRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = validate(initiateAuthSchema)(req.body);
    const result = await authService.initiateAuth(validatedData.email);

    if (!result.success) {
      throw new ApiError(400, result.message);
    }

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/otp:
 *   post:
 *     summary: Verify OTP and complete login/signup
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *               name:
 *                 type: string
 *                 example: John Doe
 *                 description: Required for new users
 *     responses:
 *       200:
 *         description: Authentication successful
 *       400:
 *         description: Invalid OTP or missing name
 *       429:
 *         description: Too many requests
 */
router.post('/otp', authRateLimit, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = validate(verifyOTPSchema)(req.body);
    const result = await authService.verifyOTPAndLogin(
      validatedData.email,
      validatedData.otp,
      validatedData.name
    );

    if (!result.success) {
      throw new ApiError(400, result.message);
    }

    res.status(200).json({
      success: true,
      message: result.message,
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', authenticate, async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const result = await authService.logout(userId);

    res.status(200).json({
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/users', authenticate, async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const profile = await userService.getUserProfile(userId);

    res.status(200).json({
      success: true,
      user: profile,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 */
router.put('/users', authenticate, async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const validatedData = validate(updateUserSchema)(req.body);
    const updated = await userService.updateUserProfile(userId, validatedData);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updated,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users:
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       401:
 *         description: Unauthorized
 */
router.delete('/users', authenticate, async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const result = await userService.deleteUser(userId);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/users/stats', authenticate, async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const stats = await userService.getUserStats(userId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/users/quota:
 *   get:
 *     summary: Check quota compliance
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quota compliance status
 *       401:
 *         description: Unauthorized
 */
router.get('/users/quota', authenticate, async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const compliance = await subscriptionManager.checkQuotaCompliance(userId);

    res.status(200).json({
      success: true,
      ...compliance,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
