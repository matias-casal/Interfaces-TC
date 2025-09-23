import { z } from 'zod';
import { MessageStatus } from '@prisma/client';

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be at most 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

export const publicKeySchema = z
  .string()
  .min(100, 'Invalid public key')
  .regex(/^-----BEGIN PUBLIC KEY-----/, 'Invalid public key format');

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  publicKey: publicKeySchema
});

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'Password is required')
});

export const sendMessageSchema = z.object({
  receiverUsername: usernameSchema,
  encryptedText: z.string().min(1, 'Message cannot be empty'),
  clientMessageId: z.string().uuid('Invalid client message ID')
});

export const updateMessageStatusSchema = z.object({
  status: z.enum(['sent', 'delivered', 'read'] as const)
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
  cursor: z.string().optional()
});