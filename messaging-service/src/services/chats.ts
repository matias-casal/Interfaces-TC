import { prisma } from '../config/database';
import { redisClient } from '../config/redis';
import {
  Chat,
  Message,
  PaginationParams
} from '../types';
import { MessageStatus } from '@prisma/client';

export const chatService = {
  async listUserChats(userId: string, pagination: PaginationParams): Promise<Chat[]> {
    const { limit = 50, offset = 0 } = pagination;

    // Get unique chat partners with their last message
    const chatsQuery = await prisma.$queryRaw<any[]>`
      WITH chat_partners AS (
        SELECT DISTINCT
          CASE
            WHEN sender_id = ${userId} THEN receiver_id
            ELSE sender_id
          END AS partner_id,
          MAX(timestamp) AS last_message_time
        FROM messages
        WHERE sender_id = ${userId} OR receiver_id = ${userId}
        GROUP BY partner_id
      )
      SELECT
        cp.partner_id,
        cp.last_message_time,
        u.username AS partner_username,
        u.public_key AS partner_public_key,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.receiver_id = ${userId}
            AND m.sender_id = cp.partner_id
            AND m.status != 'read'
        ) AS unread_count,
        (
          SELECT row_to_json(msg)
          FROM (
            SELECT id, sender_id, receiver_id, encrypted_text, status, timestamp
            FROM messages
            WHERE (sender_id = ${userId} AND receiver_id = cp.partner_id)
               OR (sender_id = cp.partner_id AND receiver_id = ${userId})
            ORDER BY timestamp DESC
            LIMIT 1
          ) msg
        ) AS last_message
      FROM chat_partners cp
      JOIN users u ON u.id = cp.partner_id
      ORDER BY cp.last_message_time DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Transform to Chat format
    const chats: Chat[] = chatsQuery.map((row: any) => {
      const chatId = [userId, row.partner_id].sort().join('-');
      return {
        chatId,
        participants: [userId, row.partner_id] as [string, string],
        lastMessage: row.last_message,
        unreadCount: Number(row.unread_count),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    });

    return chats;
  },

  async getChatMessages(
    user1: string,
    user2: string,
    pagination: PaginationParams
  ): Promise<Message[]> {
    const { limit = 50, offset = 0 } = pagination;

    // Check cache first
    const cacheKey = `chat:messages:${[user1, user2].sort().join('-')}:${limit}:${offset}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: user1, receiverId: user2 },
          { senderId: user2, receiverId: user1 }
        ]
      },
      orderBy: { timestamp: 'desc' },
      skip: offset,
      take: limit
    });

    // Cache for 1 minute
    await redisClient.setEx(cacheKey, 60, JSON.stringify(messages));

    return messages;
  },

  async getChatUnreadCount(userId: string, partnerId: string): Promise<number> {
    const count = await prisma.message.count({
      where: {
        senderId: partnerId,
        receiverId: userId,
        status: { not: MessageStatus.read }
      }
    });

    return count;
  },

  async clearChatCache(user1: string, user2: string): Promise<void> {
    const pattern = `chat:messages:${[user1, user2].sort().join('-')}:*`;
    const keys = await redisClient.keys(pattern);

    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }
};

