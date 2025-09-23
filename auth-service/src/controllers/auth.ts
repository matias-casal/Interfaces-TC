import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../middleware/error';
import { authService } from '../services/auth';
import type { ApiResponse, AuthResponse } from '../types';
import { registerSchema, loginSchema } from '../validators';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = registerSchema.parse(req.body);

      const existingUser = await authService.findUserByUsername(validatedData.username);
      if (existingUser) {
        throw new AppError('Username already exists', 409);
      }

      const result = await authService.createUser(validatedData);

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: result,
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        next(error);
      }
    }
  },

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = loginSchema.parse(req.body);

      const user = await authService.findUserByUsername(validatedData.username);
      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      const isPasswordValid = await authService.verifyPassword(
        validatedData.password,
        user.password
      );

      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401);
      }

      const result = await authService.generateAuthResponse(user);

      const response: ApiResponse<AuthResponse> = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        next(error);
      }
    }
  },

  async validateToken(req: Request, res: Response, _next: NextFunction) {
    try {
      const { token } = req.body;

      if (!token) {
        throw new AppError('Token is required', 400);
      }

      const payload = await authService.validateToken(token);

      const response: ApiResponse = {
        success: true,
        data: { valid: true, payload },
      };

      res.status(200).json(response);
    } catch (error) {
      res.status(200).json({
        success: true,
        data: {
          valid: false,
          error: error instanceof Error ? error.message : 'Invalid token',
        },
      });
    }
  },

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(400).json({
          success: false,
          error: 'No token provided',
        });
        return;
      }

      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        res.status(400).json({
          success: false,
          error: 'No token provided',
        });
        return;
      }

      await authService.blacklistToken(token);

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  },
};
