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

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

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
    const internalTokenHeader = req.headers['x-internal-token'] || req.headers['x-internal-secret'];

    const serviceName = Array.isArray(internalServiceHeader)
      ? internalServiceHeader[0]
      : internalServiceHeader;
    const providedToken = Array.isArray(internalTokenHeader)
      ? internalTokenHeader[0]
      : internalTokenHeader;

    if (serviceName) {
      const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;
      if (!expectedToken) {
        console.error('INTERNAL_SERVICE_TOKEN is not configured');
        res.status(500).json({ success: false, error: 'Service authentication misconfigured' });
        return;
      }

      if (providedToken !== expectedToken) {
        res.status(401).json({ success: false, error: 'Invalid service credentials' });
        return;
      }

      if (serviceName !== 'messaging-service') {
        res.status(403).json({ success: false, error: 'Service not authorized' });
        return;
      }

      req.user = {
        id: serviceName,
        username: serviceName,
        isService: true,
      } as JWTPayload;
      next();
      return;
    }

    if (!authHeader) {
      res.status(401).json({ success: false, error: 'No token provided' });
      return;
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    const decoded = JWTUtils.verify(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};
