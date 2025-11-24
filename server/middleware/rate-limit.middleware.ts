import rateLimit from 'express-rate-limit';

export const generalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10000'),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/api/upload/chunk',
});

export const otpRateLimit = rateLimit({
  windowMs: parseInt(process.env.OTP_RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.OTP_RATE_LIMIT_MAX || '5'),
  message: 'Too many OTP requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const emailValue = req.body.email;
    if (typeof emailValue === 'string' && emailValue.trim()) {
      return emailValue.trim().toLowerCase();
    }
    return req.ip ?? 'unknown';
  },
});

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
