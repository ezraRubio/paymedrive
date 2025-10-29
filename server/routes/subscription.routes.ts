import { authenticate } from "../middleware/auth.middleware";
import { ApiError } from "../middleware/error-handler";
import { SubscriptionManagerService } from "../services/subscription-manager.service";
import { ExtendedRequest } from "../types/extended.request";
import { upgradeTierSchema, validate } from "../utils/validations/user.validation";
import { Router, Request, Response, NextFunction } from "express";


const router = Router();
const subscriptionManager = new SubscriptionManagerService();

/**
 * @swagger
 * /api/subscription/tiers:
 *   get:
 *     summary: Get available subscription tiers
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: List of available tiers with pricing
 */
router.get('/subscription/tiers', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const tiers = await subscriptionManager.getAvailableTiers();

    res.status(200).json({
      success: true,
      tiers,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/subscription/upgrade:
 *   post:
 *     summary: Upgrade subscription tier
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tier
 *             properties:
 *               tier:
 *                 type: string
 *                 enum: [free, pro, unlimited]
 *                 example: pro
 *     responses:
 *       200:
 *         description: Subscription upgraded successfully
 *       400:
 *         description: Invalid tier or cannot downgrade
 *       401:
 *         description: Unauthorized
 *       402:
 *         description: Payment required
 */
router.post('/subscription/upgrade', authenticate, async (req: ExtendedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ApiError(401, 'User not authenticated');
    }

    const validatedData = validate(upgradeTierSchema)(req.body);
    const result = await subscriptionManager.upgradeTier(userId, validatedData.tier);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;