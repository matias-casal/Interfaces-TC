import { Request, Response, NextFunction } from 'express';
import { JWTUtils } from '../utils/jwt';
import { JWTPayload } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    const decoded = JWTUtils.verify(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

// Middleware for internal service-to-service communication
export const serviceAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    const internalServiceHeader = req.headers['x-internal-service'];

    // Allow internal service calls without token validation
    if (internalServiceHeader === 'messaging-service') {
      next();
      return;
    }

    if (!authHeader) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    const decoded = JWTUtils.verify(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};