import { z } from 'zod';

import { MessageStatus } from '../types';

export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, hyphens, and underscores'
  );

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
  .regex(/^-----BEGIN PUBLIC KEY-----/, 'Invalid public key format')
  .regex(/-----END PUBLIC KEY-----$/, 'Invalid public key format - missing end marker')
  .refine((key) => {
    // Basic validation that it looks like a Base64 encoded key between the markers
    const keyContent = key
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\n/g, '');

    // Check if the content is valid Base64
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Regex.test(keyContent);
  }, 'Invalid public key - content must be valid Base64');

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  publicKey: publicKeySchema,
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').trim(),
  password: z.string().min(1, 'Password is required'),
});

export const sendMessageSchema = z.object({
  receiverUsername: usernameSchema,
  encryptedText: z.string().min(1, 'Message cannot be empty'),
  clientMessageId: z.string().uuid('Invalid client message ID'),
});

export const updateMessageStatusSchema = z.object({
  status: z.enum([MessageStatus.SENT, MessageStatus.DELIVERED, MessageStatus.READ]),
});

export const tokenSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const userSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  publicKey: z.string().optional(),
  createdAt: z
    .date()
    .or(z.string().transform((str) => new Date(str)))
    .optional(),
  updatedAt: z
    .date()
    .or(z.string().transform((str) => new Date(str)))
    .optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
  cursor: z.string().optional(),
});
