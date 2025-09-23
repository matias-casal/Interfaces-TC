import { Router } from 'express';

import { authController } from '../controllers/auth';
import { asyncHandler } from '../middleware/error';
import { authLimiter, loginLimiter, generalLimiter } from '../middleware/rateLimit';

export const authRouter = Router();

// Apply rate limiting to auth endpoints
authRouter.post('/register', authLimiter, asyncHandler(authController.register));
authRouter.post('/login', loginLimiter, asyncHandler(authController.login));
authRouter.post('/validate-token', generalLimiter, asyncHandler(authController.validateToken));
