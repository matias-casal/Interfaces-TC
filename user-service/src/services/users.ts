import { prisma } from '../config/database';
import { redisClient } from '../config/redis';
import { User, PaginationParams } from '../types';

export const userService = {
  async listUsers(pagination: PaginationParams): Promise<Omit<User, 'password'>[]> {
    const { limit = 50, offset = 0 } = pagination;

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        publicKey: true,
        createdAt: true,
        updatedAt: true
      },
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      }
    });

    return users;
  },

  async getUserByUsername(username: string): Promise<Omit<User, 'password'> | null> {
    // Check cache first
    const cacheKey = `user:profile:${username}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        publicKey: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (user) {
      // Cache for 5 minutes
      await redisClient.setEx(cacheKey, 300, JSON.stringify(user));
    }

    return user;
  },

  async getPublicKey(username: string): Promise<string | null> {
    // Check cache first
    const cacheKey = `publicKey:${username}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return cached;
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: { publicKey: true }
    });

    if (user) {
      // Cache for 1 hour
      await redisClient.setEx(cacheKey, 3600, user.publicKey);
      return user.publicKey;
    }

    return null;
  },

  async getUserById(id: string): Promise<Omit<User, 'password'> | null> {
    // Check cache first
    const cacheKey = `user:id:${id}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        publicKey: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (user) {
      // Cache for 5 minutes
      await redisClient.setEx(cacheKey, 300, JSON.stringify(user));
    }

    return user;
  },

  async clearUserCache(username: string, userId?: string): Promise<void> {
    // Clear all cache entries for a user
    const cacheKeys = [
      `user:profile:${username}`,
      `publicKey:${username}`
    ];

    if (userId) {
      cacheKeys.push(`user:id:${userId}`);
    }

    // Delete all keys
    for (const key of cacheKeys) {
      await redisClient.del(key);
    }

    console.log(`Cache cleared for user ${username}`);
  },

  async updateUser(
    username: string,
    updates: { publicKey?: string; password?: string }
  ): Promise<Omit<User, 'password'> | null> {
    const user = await prisma.user.update({
      where: { username },
      data: updates,
      select: {
        id: true,
        username: true,
        publicKey: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (user) {
      // Clear cache after update
      await this.clearUserCache(username, user.id);

      // Optionally, pre-populate cache with new data
      const cacheKey = `user:profile:${username}`;
      await redisClient.setEx(cacheKey, 300, JSON.stringify(user));
    }

    return user;
  }
};