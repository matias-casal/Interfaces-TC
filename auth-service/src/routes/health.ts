import { Router } from 'express';

import { prisma } from '../config/database';
import { redisClient } from '../config/redis';

export const healthRouter = Router();
export default healthRouter;

healthRouter.get('/health', async (_req, res) => {
  let dbConnected = false;
  let redisConnected = false;

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch (error) {
    console.error('Database health check failed:', error);
  }

  // Check Redis connection
  try {
    const redisPing = await redisClient.ping();
    redisConnected = redisPing === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
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
      redis: redisConnected ? 'connected' : 'disconnected'
    }
  };

  res.status(isHealthy ? 200 : 503).json(response);
});