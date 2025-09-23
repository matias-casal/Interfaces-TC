import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError | ZodError | unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.errors,
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[]) || [];
      const field = target[0] || 'field';
      res.status(409).json({
        success: false,
        error: `A record with this ${field} already exists`,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Record not found',
      });
      return;
    }
  }

  // Handle JWT errors
  if (err instanceof Error && err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
    return;
  }

  if (err instanceof Error && err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token has expired',
    });
    return;
  }

  // Handle Syntax errors
  if (err instanceof SyntaxError) {
    res.status(400).json({
      success: false,
      error: 'Invalid request format',
    });
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Handle errors with statusCode property
  if (
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as any).statusCode === 'number'
  ) {
    const errorWithCode = err as { statusCode: number; message?: string };
    res.status(errorWithCode.statusCode).json({
      success: false,
      error: errorWithCode.message || 'An error occurred',
    });
    return;
  }

  // Log unexpected errors
  console.error('Error:', err);

  // Handle all other errors
  const isDevelopment = process.env.NODE_ENV === 'development';
  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({
    success: false,
    error: isDevelopment ? message : 'Internal server error',
  });
};

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler = (fn: AsyncRequestHandler) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
