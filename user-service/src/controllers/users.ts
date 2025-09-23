import { Request, Response } from 'express';
import { userService } from '../services/users';
import { AppError } from '../middleware/error';
import { ApiResponse, User } from '../types';
import { paginationSchema } from '../validators';

export const userController = {
  async listUsers(req: Request, res: Response) {
    const pagination = paginationSchema.parse(req.query);
    const users = await userService.listUsers(pagination);

    const response: ApiResponse<Omit<User, 'password'>[]> = {
      success: true,
      data: users,
    };

    res.json(response);
  },

  async getUserByUsername(req: Request, res: Response) {
    const { username } = req.params;

    if (!username) {
      throw new AppError('Username is required', 400);
    }

    const user = await userService.getUserByUsername(username);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const response: ApiResponse<Omit<User, 'password'>> = {
      success: true,
      data: user,
    };

    res.json(response);
  },

  async getPublicKey(req: Request, res: Response) {
    const { username } = req.params;

    if (!username) {
      throw new AppError('Username is required', 400);
    }

    const publicKey = await userService.getPublicKey(username);

    if (!publicKey) {
      throw new AppError('User not found', 404);
    }

    const response: ApiResponse<{ publicKey: string }> = {
      success: true,
      data: { publicKey },
    };

    res.json(response);
  },
};
