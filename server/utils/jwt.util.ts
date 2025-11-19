import jwt, { SignOptions } from 'jsonwebtoken';
import { logger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
  userId: string;
  email: string;
  tier: string;
}

export const generateToken = (payload: JWTPayload): string => {
  try {
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN as string,
      issuer: 'paymedrive',
    } as SignOptions);

    logger.info(`JWT generated for user ${payload.userId}`);
    return token;
  } catch (error) {
    logger.error('Error generating JWT:', error);
    throw new Error('Failed to generate token');
  }
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'paymedrive',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('JWT verification failed: Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('JWT verification failed: Invalid token');
    } else {
      logger.error('JWT verification error:', error);
    }
    return null;
  }
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded === 'string') {
      return null;
    }
    if ('userId' in decoded && 'email' in decoded && 'tier' in decoded) {
      return decoded as JWTPayload;
    }
    return null;
  } catch (error) {
    logger.error('Error decoding JWT:', error);
    return null;
  }
};

export const extractTokenFromHeader = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};
