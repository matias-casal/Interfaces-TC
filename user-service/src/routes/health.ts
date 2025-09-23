import { Router } from 'express';
import { prisma } from '../config/database';
import { redisClient } from '../config/redis';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis connection
    const redisPing = await redisClient.ping();

    res.json({
      status: 'healthy',
      service: 'user-service',
      timestamp: new Date().toISOString(),
      dependencies: {
        database: 'connected',
        redis: redisPing === 'PONG' ? 'connected' : 'disconnected'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'user-service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});