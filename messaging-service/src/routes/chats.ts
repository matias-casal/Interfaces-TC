import { Router } from 'express';
import { chatController } from '../controllers/chats';
import { asyncHandler } from '../middleware/error';
import { authMiddleware } from '../middleware/auth';

export const chatRouter = Router();

// All routes require authentication
chatRouter.use(authMiddleware);

// List all chats for the authenticated user
chatRouter.get('/', asyncHandler(chatController.listChats));

// Get messages in a specific chat
chatRouter.get('/:chatId/messages', asyncHandler(chatController.getChatMessages));
