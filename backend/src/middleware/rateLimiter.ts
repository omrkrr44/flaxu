import rateLimit from 'express-rate-limit';
import config from '../config/env';

export const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const tradingLimiter = rateLimit({
  windowMs: config.TRADING_RATE_LIMIT_WINDOW_MS,
  max: config.TRADING_RATE_LIMIT_MAX,
  message: 'Too many trading requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
