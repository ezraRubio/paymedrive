import { Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt.util';
import { ApiError } from './error-handler';
import { logger } from '../utils/logger';
import { ExtendedRequest } from '../types/extended.request';

export const authenticate = (req: ExtendedRequest, _: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let token = extractTokenFromHeader(authHeader);

    if (!token && req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    const payload = verifyToken(token);

    if (!payload) {
      throw new ApiError(401, 'Invalid or expired token');
    }

    req.user = {
      userId: payload.userId,
      email: payload.email,
      tier: payload.tier,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      logger.error('Authentication error:', error);
      next(new ApiError(401, 'Authentication failed'));
    }
  }
};
