import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

import { redisClient } from '../config/redis';

/**
 * Create a rate limiter with Redis store
 */
export const createRateLimiter = (options: Partial<Options> = {}): RateLimitRequestHandler => {
  // Disable rate limiting in development if DISABLE_RATE_LIMIT is set
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return ((req: Request, res: Response, next: NextFunction) => next()) as RateLimitRequestHandler;
  }

  const defaultOptions: Partial<Options> = {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: options.message || 'Too many requests, please try again later.'
      });
    },
    keyGenerator: (req: Request) => {
      // Use user ID for authenticated users, IP for guests
      const reqWithUser = req as Request & { body?: { user?: { id?: string } } };
      if (reqWithUser.body?.user?.id) {
        return reqWithUser.body.user.id;
      }
      // Handle proxy IPs
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) {
        return (forwarded as string).split(',')[0].trim();
      }
      return req.ip || 'unknown';
    },
    store: new RedisStore({
      client: redisClient,
      prefix: 'rate_limit:'
    } as any)
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * Rate Limiting Configuration
 *
 * All rate limiters provide the following headers in response:
 * - X-RateLimit-Limit: Maximum number of requests
 * - X-RateLimit-Remaining: Number of requests remaining
 * - X-RateLimit-Reset: Time when the limit resets (Unix timestamp)
 */

// General rate limiter - 100 requests per minute per IP
export const generalLimiter = createRateLimiter();

/**
 * Auth rate limiter - stricter for registration endpoints
 * Limit: 5 attempts per 15 minutes per IP
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

/**
 * Login rate limiter - very strict to prevent brute force
 * Limit: 3 attempts per 15 minutes per IP
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 login requests per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

/**
 * API rate limiter - for authenticated users
 * Limit: 200 requests per minute per user ID
 */
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Higher limit for authenticated users
  message: 'API rate limit exceeded, please slow down your requests.'
});

/**
 * Message sending rate limiter
 * Limit: 30 messages per minute per user
 * Prevents spam and abuse of messaging system
 */
export const messageLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  message: 'Message rate limit exceeded. Maximum 30 messages per minute.'
});

// Aliases for backward compatibility
export const authLimiter = authRateLimiter;
export const loginLimiter = loginRateLimiter;