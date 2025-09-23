import { Request, Response } from 'express';
import { chatService } from '../services/chats';
import { paginationSchema } from '../validators';
import {
  ApiResponse,
  Chat,
  Message
} from '../types';
import { AppError } from '../middleware/error';

export const chatController = {
  async listChats(req: Request, res: Response) {
    // Parse and validate pagination params
    const pagination = paginationSchema.parse({
      limit: req.query.limit,
      offset: req.query.offset,
      cursor: req.query.cursor
    });
    const userId = req.user!.id;

    const chats = await chatService.listUserChats(userId, pagination);

    const response: ApiResponse<Chat[]> = {
      success: true,
      data: chats
    };

    res.json(response);
  },

  async getChatMessages(req: Request, res: Response) {
    const { chatId } = req.params;
    // Parse and validate pagination params
    const pagination = paginationSchema.parse({
      limit: req.query.limit,
      offset: req.query.offset,
      cursor: req.query.cursor
    });
    const userId = req.user!.id;

    if (!chatId) {
      throw new AppError('Chat ID is required', 400);
    }

    // Parse chat ID (format: can be either "userId1-userId2" or full UUID format)
    // Handle both simple format and full UUID concatenated format
    let user1: string;
    let user2: string;

    // Check if it's a complex format with multiple UUID parts
    const parts = chatId.split('-');

    if (parts.length === 10) {
      // Format: uuid1-uuid2 where each uuid has 5 parts
      // Example: "24adeb5a-6a61-49ee-98db-09aae721edb2-e76d9c90-c580-402e-aa7a-f0a7b42ad889"
      user1 = parts.slice(0, 5).join('-');
      user2 = parts.slice(5, 10).join('-');
    } else if (parts.length === 2) {
      // Simple format: "userId1-userId2"
      user1 = parts[0];
      user2 = parts[1];
    } else {
      throw new AppError('Invalid chat ID format', 400);
    }

    if (!user1 || !user2) {
      throw new AppError('Invalid chat ID format', 400);
    }

    // Verify the user is part of this chat
    if (userId !== user1 && userId !== user2) {
      throw new AppError('Unauthorized to view this chat', 403);
    }

    const messages = await chatService.getChatMessages(
      user1,
      user2,
      pagination
    );

    const response: ApiResponse<Message[]> = {
      success: true,
      data: messages
    };

    res.json(response);
  }
};