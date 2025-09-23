export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

export interface JWTPayload {
  id: string;
  username: string;
  iat?: number;
  exp?: number;
}
