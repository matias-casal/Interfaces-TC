import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Configuration for User Service
 *
 * NOTE: Current limits are permissive for development/testing.
 * For production, consider stricter limits:
 * - User queries: 30-60 per minute
 * - Profile operations: 10-20 per minute
 * - Authentication: 3-5 attempts per 15 minutes
 *
 * All rate limiters provide the following headers in response:
 * - X-RateLimit-Limit: Maximum number of requests
 * - X-RateLimit-Remaining: Number of requests remaining
 * - X-RateLimit-Reset: Time when the limit resets (Unix timestamp)
 */

// General rate limiter - 100 requests per minute per IP
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Auth rate limiter - stricter for registration endpoints
 * Limit: 5 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * Login rate limiter - very strict to prevent brute force
 * Limit: 3 attempts per 15 minutes per IP
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 login requests per windowMs
  message: 'Too many login attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

/**
 * API rate limiter - for authenticated users
 * Limit: 200 requests per minute per user ID
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200, // Higher limit for authenticated users
  keyGenerator: (req: any) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id || req.ip || 'anonymous';
  },
  message: 'API rate limit exceeded, please slow down your requests.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Message sending rate limiter
 * Limit: 30 messages per minute per user
 * Prevents spam and abuse of messaging system
 */
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute
  keyGenerator: (req: any) => {
    return req.user?.id || req.ip || 'anonymous';
  },
  message: 'Message rate limit exceeded. Maximum 30 messages per minute.',
  standardHeaders: true,
  legacyHeaders: false,
});
