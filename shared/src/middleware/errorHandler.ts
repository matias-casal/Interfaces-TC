import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/library';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, true);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, true);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true);
  }
}

export const errorHandler = (
  err: Error | AppError | ZodError | unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Internal server error';
  let details: any = undefined;
  let isOperational = false;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation error';
    details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    isOperational = true;
  }

  // Handle Prisma errors
  else if (err instanceof PrismaClientKnownRequestError) {
    isOperational = true;

    switch (err.code) {
      case 'P2002': {
        const target = (err.meta?.target as string[]) || [];
        const field = target[0] || 'field';
        statusCode = 409;
        message = `A record with this ${field} already exists`;
        break;
      }

      case 'P2025':
        statusCode = 404;
        message = 'Record not found';
        break;

      case 'P2003':
        statusCode = 400;
        message = 'Foreign key constraint failed';
        break;

      case 'P2014':
        statusCode = 400;
        message = 'Invalid ID provided';
        break;

      default:
        statusCode = 400;
        message = 'Database operation failed';
        details = { code: err.code };
    }
  }

  // Handle Prisma validation errors
  else if (err instanceof PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
    isOperational = true;
  }

  // Handle JWT errors
  else if (err instanceof Error) {
    if (err.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid or expired token';
      isOperational = true;
    } else if (err.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token has expired';
      isOperational = true;
    } else if (err.name === 'SyntaxError') {
      statusCode = 400;
      message = 'Invalid request format';
      isOperational = true;
    }
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
    isOperational = err.isOperational;
  }

  // Log non-operational errors
  if (!isOperational) {
    console.error('Non-operational error:', err);

    // In production, don't expose internal errors
    if (process.env.NODE_ENV === 'production') {
      message = 'Something went wrong';
      details = undefined;
    }
  }

  const response: any = {
    success: false,
    error: message,
  };

  if (details) {
    response.details = details;
  }

  if (process.env.NODE_ENV === 'development' && err instanceof Error) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// Async handler wrapper
export const asyncHandler = <T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: T, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Not found handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.path}`,
  });
};
