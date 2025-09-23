import { prisma } from '../config/database';
import { redisClient } from '../config/redis';
import type {
  RegisterRequest,
  AuthResponse,
  User,
  JWTPayload
} from '../types';
import { CryptoUtils } from '../utils/crypto';
import { JWTUtils } from '../utils/jwt';

export const authService = {
  async findUserByUsername(username: string): Promise<User | null> {
    // Check cache first
    const cacheKey = `user:username:${username}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (user) {
      // Cache for 5 minutes
      await redisClient.setEx(cacheKey, 300, JSON.stringify(user));
    }

    return user;
  },

  async createUser(data: RegisterRequest): Promise<AuthResponse> {
    const hashedPassword = await CryptoUtils.hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        publicKey: data.publicKey
      }
    });

    // Clear cache for username check
    await redisClient.del(`user:username:${user.username}`);

    // Generate JWT
    const token = JWTUtils.sign({
      id: user.id,
      username: user.username
    });

    const { password: _password, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword
    };
  },

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return CryptoUtils.comparePassword(password, hash);
  },

  async generateAuthResponse(user: User): Promise<AuthResponse> {
    const token = JWTUtils.sign({
      id: user.id,
      username: user.username
    });

    const { password: _password, ...userWithoutPassword } = user;

    return {
      token,
      user: userWithoutPassword
    };
  },

  async validateToken(token: string): Promise<JWTPayload> {
    // Check if token is blacklisted
    const isBlacklisted = await redisClient.get(`blacklist:${token}`);
    if (isBlacklisted) {
      throw new Error('Token is blacklisted');
    }

    return JWTUtils.verify(token);
  },

  async blacklistToken(token: string, expiryInSeconds: number = 86400): Promise<void> {
    await redisClient.setEx(`blacklist:${token}`, expiryInSeconds, '1');
  }
};