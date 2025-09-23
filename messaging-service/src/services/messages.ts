import { prisma } from '../config/database';
import { publishMessage } from '../config/redis';
import axios from 'axios';
import { Message } from '../types';
import { MessageStatus } from '@prisma/client';
import { AppError } from '../middleware/error';
import { CryptoUtils } from '../utils/crypto';
import { JWTUtils } from '../utils/jwt';

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

    try {
      const userResponse = await axios.get(
        `${userServiceUrl}/users/${data.receiverUsername}`,
        {
          headers: {
            'x-internal-service': 'messaging-service' // Internal service header
          }
        }
      );

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
          status: MessageStatus.sent
        }
      });

      // Publish to Redis for real-time delivery
      await publishMessage(`new_message:${receiver.id}`, {
        id: message.id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        encryptedText: message.encryptedText,
        status: message.status,
        timestamp: message.timestamp
      });

      return message;
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
    return prisma.message.findUnique({
      where: { clientMessageId }
    });
  },

  async findById(id: string): Promise<Message | null> {
    return prisma.message.findUnique({
      where: { id }
    });
  },

  async updateMessageStatus(id: string, status: MessageStatus): Promise<Message> {
    const message = await prisma.message.update({
      where: { id },
      data: { status }
    });

    // Publish status update to Redis
    await publishMessage(`message_status:${message.senderId}`, {
      messageId: id,
      status,
      timestamp: new Date()
    });

    return message;
  },

  async markAsDelivered(userId: string): Promise<void> {
    // Mark all pending messages for this user as delivered
    await prisma.message.updateMany({
      where: {
        receiverId: userId,
        status: MessageStatus.sent
      },
      data: {
        status: MessageStatus.delivered
      }
    });
  },

  async markAsRead(messageIds: string[], userId: string): Promise<void> {
    await prisma.message.updateMany({
      where: {
        id: { in: messageIds },
        receiverId: userId,
        status: { not: MessageStatus.read }
      },
      data: {
        status: MessageStatus.read
      }
    });

    // Publish read receipts
    const messages = await prisma.message.findMany({
      where: { id: { in: messageIds } },
      select: { senderId: true }
    });

    const senderIds = [...new Set(messages.map((m: any) => m.senderId))];

    for (const senderId of senderIds) {
      await publishMessage(`message_status:${senderId}`, {
        messageIds,
        status: MessageStatus.read,
        timestamp: new Date()
      });
    }
  }
};