import { Router } from 'express';
import { messageController } from '../controllers/messages';
import { asyncHandler } from '../middleware/error';
import { authMiddleware } from '../middleware/auth';
import { messageLimiter } from '../middleware/rateLimit';

export const messageRouter = Router();

// All routes require authentication
messageRouter.use(authMiddleware);

// Send message with rate limiting
messageRouter.post('/', messageLimiter, asyncHandler(messageController.sendMessage));

// Update message status
messageRouter.patch('/:id/status', asyncHandler(messageController.updateMessageStatus));
