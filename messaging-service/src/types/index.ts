// Import types from Prisma
import { MessageStatus as PrismaMessageStatus, Message as PrismaMessage } from '@prisma/client';

// Re-export Prisma types
export { MessageStatus } from '@prisma/client';

export interface User {
  id: string;
  username: string;
  password: string;
  publicKey: string;
  createdAt: Date;
  updatedAt: Date;
}

// Use Prisma's Message type directly
export type Message = PrismaMessage;

export interface Chat {
  chatId: string;
  participants: [string, string];
  lastMessage?: Message;
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  id: string;
  username: string;
  isService?: boolean;
  iat?: number;
  exp?: number;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  publicKey: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Omit<User, 'password'>;
}

export interface SendMessageRequest {
  receiverUsername: string;
  encryptedText: string;
  clientMessageId: string;
}

export interface UpdateMessageStatusRequest {
  status: PrismaMessageStatus;
}