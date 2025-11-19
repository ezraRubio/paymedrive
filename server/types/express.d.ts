import { JwtPayload } from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        tier: string;
      };
      body: {
        email?: unknown;
        otp?: unknown;
        name?: unknown;
        tier?: unknown;
        [key: string]: unknown;
      };
    }
  }
}
