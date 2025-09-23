import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

/**
 * Create Redis client for rate limiting
 * Uses Redis v4 without legacy mode
 */
const createRedisClient = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://redis:6379';

  const client = createClient({
    url: redisUrl,
  });

  client.on('error', (err) => {
    logger.error('Rate Limit Redis Client Error:', err);
  });

  await client.connect();
  return client;
};

/**
 * Rate limiter configurations
 * NOTE: These limits are quite permissive for development.
 * For production, consider much stricter limits:
 * - Authentication: 3-5 attempts per 15 minutes
 * - General API: 60-100 requests per minute
 * - Message sending: 10-20 messages per minute
 */

// Create rate limiters with fallback to memory store
export const createRateLimiter = (options: any = {}) => {
  // Skip rate limiting in tests
  if (process.env.NODE_ENV === 'test') {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  const defaultOptions = {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // Quite permissive for development
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: options.message || 'Too many requests, please try again later.',
      });
    },
  };

  // Try to use Redis store, fallback to memory if Redis is not available
  if (process.env.NODE_ENV === 'production' || process.env.USE_REDIS === 'true') {
    return (async () => {
      try {
        const client = await createRedisClient();
        return rateLimit({
          ...defaultOptions,
          ...options,
          store: new RedisStore({
            // @ts-ignore - Redis v4 client works with rate-limit-redis
            client: client,
            prefix: 'rl:',
          }),
        });
      } catch (error) {
        logger.warn('Redis not available for rate limiting, using memory store:', error);
        return rateLimit({ ...defaultOptions, ...options });
      }
    })();
  }

  // Default to memory store for development
  return rateLimit({ ...defaultOptions, ...options });
};

// Pre-configured limiters for different endpoints
// NOTE: These are development-friendly limits. Tighten for production!

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window (production: reduce to 3-5)
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: false,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window (production: reduce to 3)
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful logins
});

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute (production: consider 60)
  message: 'Too many requests, please try again later.',
});
