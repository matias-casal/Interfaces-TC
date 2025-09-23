import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler, Options } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

// Create a Redis client specifically for rate limiting
const createRateLimitRedisClient = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = createClient({
    url: redisUrl,
    legacyMode: true,
  });

  client.on('error', (err) => {
    console.error('Rate Limit Redis Client Error:', err);
  });

  // Connect the client
  client.connect().catch(console.error);

  return client;
};

/**
 * Create a rate limiter with Redis store
 */
export const createRateLimiter = (options: Partial<Options> = {}): RateLimitRequestHandler => {
  // Disable rate limiting in test environment or when explicitly disabled
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true') {
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
        error: options.message || 'Too many requests, please try again later.',
      });
    },
    keyGenerator: (req: Request) => {
      // Use user ID for authenticated users, IP for guests
      const reqWithUser = req as Request & { user?: { id?: string } };
      if (reqWithUser.user?.id) {
        return reqWithUser.user.id;
      }
      // Handle proxy IPs
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) {
        return (forwarded as string).split(',')[0].trim();
      }
      return req.ip || 'unknown';
    },
  };

  // Only use Redis store in production or when Redis is available
  if (process.env.NODE_ENV === 'production' || process.env.USE_REDIS_RATE_LIMIT === 'true') {
    try {
      const redisClient = createRateLimitRedisClient();
      return rateLimit({
        ...defaultOptions,
        ...options,
        store: new RedisStore({
          // @ts-ignore - The redis client in legacy mode works with rate-limit-redis
          client: redisClient,
          prefix: 'rate_limit:',
        }),
      });
    } catch (error) {
      console.warn('Failed to create Redis rate limiter, falling back to memory store:', error);
    }
  }

  // Fallback to memory store for development
  return rateLimit({ ...defaultOptions, ...options });
};

// Pre-configured rate limiters
export const generalLimiter = createRateLimiter();

export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
});

export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: 'API rate limit exceeded, please slow down your requests.',
});

export const messageLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Message rate limit exceeded. Maximum 30 messages per minute.',
});
