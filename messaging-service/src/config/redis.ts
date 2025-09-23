import { createClient } from 'redis';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
});

export const redisSubscriber = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

redisSubscriber.on('error', (err) => {
  logger.error('Redis Subscriber Error:', err);
});

// Helper function for pub/sub
export async function publishMessage(channel: string, message: any): Promise<void> {
  await redisClient.publish(channel, JSON.stringify(message));
}
