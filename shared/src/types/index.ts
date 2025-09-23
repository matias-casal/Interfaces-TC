export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read'
}

export interface User {
  id: string;
  username: string;
  publicKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  encryptedText: string;
  status: MessageStatus;
  clientMessageId: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

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
  status: MessageStatus;
}