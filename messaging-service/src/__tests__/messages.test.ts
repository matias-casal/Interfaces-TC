import { messageService } from '../services/messages';
import { prisma } from '../config/database';
import { publishMessage } from '../config/redis';
import axios from 'axios';
import { MessageStatus } from '../types';

// Mock dependencies
jest.mock('../config/database', () => ({
  prisma: {
    message: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn()
    }
  }
}));

jest.mock('../config/redis', () => ({
  publishMessage: jest.fn(),
  redisClient: {
    connect: jest.fn(),
    quit: jest.fn()
  }
}));

jest.mock('axios');

describe('Message Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a new message successfully', async () => {
      const messageData = {
        senderId: 'sender-123',
        receiverUsername: 'receiver',
        encryptedText: 'encrypted-content',
        clientMessageId: 'client-msg-123'
      };

      const mockReceiver = {
        id: 'receiver-456',
        username: 'receiver'
      };

      const mockMessage = {
        id: 'msg-789',
        senderId: messageData.senderId,
        receiverId: mockReceiver.id,
        encryptedText: messageData.encryptedText,
        clientMessageId: messageData.clientMessageId,
        status: MessageStatus.sent,
        timestamp: new Date()
      };

      (axios.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: mockReceiver }
      });

      (prisma.message.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageService.sendMessage(messageData);

      expect(result).toEqual(mockMessage);
      expect(prisma.message.create).toHaveBeenCalled();
      expect(publishMessage).toHaveBeenCalledWith(
        `new_message:${mockReceiver.id}`,
        expect.objectContaining({
          id: mockMessage.id,
          senderId: mockMessage.senderId
        })
      );
    });

    it('should throw error if receiver not found', async () => {
      const messageData = {
        senderId: 'sender-123',
        receiverUsername: 'nonexistent',
        encryptedText: 'encrypted-content',
        clientMessageId: 'client-msg-123'
      };

      const axiosError = new Error('Not found');
      (axiosError as any).response = { status: 404 };
      (axiosError as any).isAxiosError = true;

      (axios.get as jest.Mock).mockRejectedValue(axiosError);
      (axios.isAxiosError as unknown as jest.Mock) = jest.fn().mockReturnValue(true);

      await expect(messageService.sendMessage(messageData))
        .rejects.toThrow('Receiver not found');
    });
  });

  describe('findByClientMessageId', () => {
    it('should find message by client message ID', async () => {
      const mockMessage = {
        id: 'msg-123',
        clientMessageId: 'client-123'
      };

      (prisma.message.findUnique as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageService.findByClientMessageId('client-123');

      expect(result).toEqual(mockMessage);
      expect(prisma.message.findUnique).toHaveBeenCalledWith({
        where: { clientMessageId: 'client-123' }
      });
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message status and publish event', async () => {
      const mockMessage = {
        id: 'msg-123',
        senderId: 'sender-123',
        status: MessageStatus.delivered
      };

      (prisma.message.update as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageService.updateMessageStatus(
        'msg-123',
        MessageStatus.delivered
      );

      expect(result).toEqual(mockMessage);
      expect(publishMessage).toHaveBeenCalledWith(
        `message_status:${mockMessage.senderId}`,
        expect.objectContaining({
          messageId: 'msg-123',
          status: MessageStatus.delivered
        })
      );
    });
  });

  describe('markAsDelivered', () => {
    it('should mark all sent messages as delivered for user', async () => {
      const userId = 'user-123';

      await messageService.markAsDelivered(userId);

      expect(prisma.message.updateMany).toHaveBeenCalledWith({
        where: {
          receiverId: userId,
          status: MessageStatus.sent
        },
        data: {
          status: MessageStatus.delivered
        }
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read and publish receipts', async () => {
      const messageIds = ['msg-1', 'msg-2'];
      const userId = 'user-123';

      const mockMessages = [
        { senderId: 'sender-1' },
        { senderId: 'sender-2' }
      ];

      (prisma.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

      await messageService.markAsRead(messageIds, userId);

      expect(prisma.message.updateMany).toHaveBeenCalled();
      expect(publishMessage).toHaveBeenCalledTimes(2);
    });
  });
});