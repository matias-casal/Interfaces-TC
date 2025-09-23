import { prisma } from '../config/database';
import { publishMessage, redisClient } from '../config/redis';
import axios from 'axios';
import { Message, MessageStatus } from '../types';
import { AppError } from '../middleware/error';
import { normalizeMessage } from '../utils/message';
import { logger } from '../utils/logger';

interface SendMessageData {
  senderId: string;
  receiverUsername: string;
  encryptedText: string;
  clientMessageId: string;
}

export const messageService = {
  async sendMessage(data: SendMessageData): Promise<Message> {
    // Get receiver user from User Service
    const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3002';
    const internalServiceToken = process.env.INTERNAL_SERVICE_TOKEN;

    if (!internalServiceToken) {
      throw new AppError('Internal service credentials not configured', 500);
    }

    try {
      const userResponse = await axios.get(`${userServiceUrl}/users/${data.receiverUsername}`, {
        headers: {
          'x-internal-service': 'messaging-service', // Internal service header
          'x-internal-token': internalServiceToken,
        },
      });

      if (!userResponse.data.success) {
        throw new AppError('Receiver not found', 404);
      }

      const receiver = userResponse.data.data;

      // Create message
      const message = await prisma.message.create({
        data: {
          senderId: data.senderId,
          receiverId: receiver.id,
          encryptedText: data.encryptedText,
          clientMessageId: data.clientMessageId,
          status: MessageStatus.sent,
        },
      });

      const normalizedMessage = normalizeMessage(message);

      const payload = {
        id: normalizedMessage.id,
        senderId: normalizedMessage.senderId,
        receiverId: normalizedMessage.receiverId,
        encryptedText: normalizedMessage.encryptedText,
        status: normalizedMessage.status,
        timestamp: normalizedMessage.timestamp,
      };

      // Publish to Redis for real-time delivery
      await publishMessage(`new_message:${receiver.id}`, payload);

      // Queue message when the receiver is offline
      try {
        const isOnline = await redisClient.get(`user:online:${receiver.id}`);
        if (!isOnline) {
          const pendingKey = `pending:${receiver.id}`;
          await redisClient.rPush(pendingKey, JSON.stringify(payload));
          await redisClient.expire(pendingKey, 60 * 60 * 24); // keep pending messages for 24h
        }
      } catch (error) {
        logger.warn('Failed to enqueue offline message', { error });
      }

      return normalizedMessage;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new AppError('Receiver not found', 404);
        }
      }
      throw error;
    }
  },

  async findByClientMessageId(clientMessageId: string): Promise<Message | null> {
    const message = await prisma.message.findUnique({
      where: { clientMessageId },
    });

    return message ? normalizeMessage(message) : null;
  },

  async findById(id: string): Promise<Message | null> {
    const message = await prisma.message.findUnique({
      where: { id },
    });

    return message ? normalizeMessage(message) : null;
  },

  async updateMessageStatus(id: string, status: MessageStatus): Promise<Message> {
    const message = await prisma.message.update({
      where: { id },
      data: { status },
    });

    const normalizedMessage = normalizeMessage(message);

    // Publish status update to Redis
    await publishMessage(`message_status:${normalizedMessage.senderId}`, {
      messageId: id,
      status,
      timestamp: new Date(),
    });

    return normalizedMessage;
  },

  async markAsDelivered(messageIds: string[], userId: string): Promise<void> {
    if (!messageIds.length) {
      return;
    }

    await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        receiverId: userId,
        status: MessageStatus.sent,
      },
      data: {
        status: MessageStatus.delivered,
      },
    });

    const updatedMessages = (await prisma.message.findMany({
      where: {
        id: { in: messageIds },
        receiverId: userId,
      },
      select: {
        id: true,
        senderId: true,
      },
    })) as Array<{ id: string; senderId: string }>;

    const messagesBySender = updatedMessages.reduce(
      (acc: Record<string, string[]>, current: { id: string; senderId: string }) => {
      if (!acc[current.senderId]) {
        acc[current.senderId] = [];
      }
      acc[current.senderId].push(current.id);
      return acc;
      },
      {}
    );

    const timestamp = new Date();

    await Promise.all(
      Object.entries(messagesBySender).map(([senderId, ids]) =>
        publishMessage(`message_status:${senderId}`, {
          messageIds: ids,
          status: MessageStatus.delivered,
          timestamp,
        })
      )
    );
  },

  async markAsRead(messageIds: string[], userId: string): Promise<void> {
    await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        receiverId: userId,
        status: { not: MessageStatus.read },
      },
      data: {
        status: MessageStatus.read,
      },
    });

    // Publish read receipts
    const messages = (await prisma.message.findMany({
      where: { id: { in: messageIds }, receiverId: userId },
      select: { senderId: true, id: true },
    })) as Array<{ id: string; senderId: string }>;

    const messagesBySender = messages.reduce(
      (acc: Record<string, string[]>, current: { id: string; senderId: string }) => {
      if (!acc[current.senderId]) {
        acc[current.senderId] = [];
      }
      acc[current.senderId].push(current.id);
      return acc;
      },
      {}
    );

    const timestamp = new Date();

    await Promise.all(
      Object.entries(messagesBySender).map(([senderId, ids]) =>
        publishMessage(`message_status:${senderId}`, {
          messageIds: ids,
          status: MessageStatus.read,
          timestamp,
        })
      )
    );
  },
};
