import { Router } from 'express';
import { userController } from '../controllers/users';
import { asyncHandler } from '../middleware/error';
import { authMiddleware, serviceAuthMiddleware } from '../middleware/auth';

export const userRouter = Router();

// Protected routes
userRouter.get('/', authMiddleware, asyncHandler(userController.listUsers));
// Use serviceAuthMiddleware for getUserByUsername to allow internal services
userRouter.get('/:username', serviceAuthMiddleware, asyncHandler(userController.getUserByUsername));
userRouter.get('/:username/public-key', authMiddleware, asyncHandler(userController.getPublicKey));