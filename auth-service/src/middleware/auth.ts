import type { Request, Response, NextFunction } from 'express';

import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import type { JWTPayload } from '../types';
import { JWTUtils } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ success: false, error: 'No authorization token provided' });
      return;
    }

    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Invalid token format' });
      return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ success: false, error: 'Invalid token format' });
      return;
    }

    // Check if token is blacklisted
    try {
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        res.status(401).json({ success: false, error: 'Token has been revoked' });
        return;
      }
    } catch (redisError) {
      // Continue even if Redis fails, let JWT validation handle it
      logger.error('Redis error during blacklist check:', redisError);
    }

    try {
      const decoded = JWTUtils.verify(token);
      req.body.user = decoded;
      req.user = decoded;
      next();
    } catch (jwtError) {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};
