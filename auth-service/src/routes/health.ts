import { Router } from 'express';

import { prisma } from '../config/database';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

export const healthRouter = Router();
export default healthRouter;

healthRouter.get('/', async (_req, res) => {
  let dbConnected = false;
  let redisConnected = false;

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch (error) {
    logger.error('Database health check failed:', error);
  }

  // Check Redis connection
  try {
    // Check if Redis client is connected
    if (redisClient.isOpen) {
      // For legacy mode, use v3 API
      const redisPing = await redisClient.v4.ping();
      redisConnected = redisPing === 'PONG';
    } else {
      redisConnected = false;
    }
  } catch (error) {
    // Fallback: check if client is at least connected
    try {
      redisConnected = redisClient.isOpen || redisClient.isReady;
    } catch {
      redisConnected = false;
    }
    logger.error('Redis health check failed:', error);
  }

  const isHealthy = dbConnected && redisConnected;
  const status = isHealthy ? 'healthy' : 'unhealthy';

  // Get package version
  let version = 'unknown';
  try {
    const packageJson = require('../../package.json') as { version?: string };
    version = packageJson.version || 'unknown';
  } catch {
    // Ignore error - version will remain 'unknown'
  }

  const response = {
    status,
    service: 'auth-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version,
    dependencies: {
      database: dbConnected ? 'connected' : 'disconnected',
      redis: redisConnected ? 'connected' : 'disconnected',
    },
  };

  res.status(isHealthy ? 200 : 503).json(response);
});
