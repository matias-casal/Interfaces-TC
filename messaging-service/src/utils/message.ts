import { Message, MessageStatus } from '../types';

export const normalizeMessage = (message: any): Message => ({
  ...message,
  status: (message?.status ?? 'sent') as MessageStatus,
});
