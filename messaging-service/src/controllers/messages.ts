import { Request, Response } from 'express';
import { messageService } from '../services/messages';
import {
  sendMessageSchema,
  updateMessageStatusSchema
} from '../validators';
import { AppError } from '../middleware/error';
import {
  ApiResponse,
  Message
} from '../types';
import { MessageStatus } from '@prisma/client';

export const messageController = {
  async sendMessage(req: Request, res: Response) {
    const validatedData = sendMessageSchema.parse(req.body);
    const senderId = req.user!.id;

    // Check for idempotency
    const existingMessage = await messageService.findByClientMessageId(
      validatedData.clientMessageId
    );

    if (existingMessage) {
      const response: ApiResponse<Message> = {
        success: true,
        data: existingMessage,
        message: 'Message already sent (idempotent response)'
      };
      return res.json(response);
    }

    // Send new message
    const message = await messageService.sendMessage({
      senderId,
      ...validatedData
    });

    const response: ApiResponse<Message> = {
      success: true,
      data: message
    };

    res.status(201).json(response);
  },

  async updateMessageStatus(req: Request, res: Response) {
    const { id } = req.params;
    const validatedData = updateMessageStatusSchema.parse(req.body);
    const userId = req.user!.id;

    // Verify the user has permission to update this message
    const message = await messageService.findById(id);

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    // Only receiver can mark as delivered/read
    if (message.receiverId !== userId &&
        (validatedData.status === MessageStatus.delivered ||
         validatedData.status === MessageStatus.read)) {
      throw new AppError('Unauthorized to update message status', 403);
    }

    const updatedMessage = await messageService.updateMessageStatus(
      id,
      validatedData.status
    );

    const response: ApiResponse<Message> = {
      success: true,
      data: updatedMessage
    };

    res.json(response);
  }
};