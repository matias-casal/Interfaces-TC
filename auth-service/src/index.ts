import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { redisClient } from './config/redis';
import { prisma } from './config/database';
import { generalLimiter } from './middleware/rateLimit';
import { logger, requestLogger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - required for X-Forwarded headers from Nginx
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);
// Replace morgan with our custom logger in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Routes
app.use('/health', healthRouter);
app.use('/auth', authRouter);

// Error handling
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  await redisClient.quit();
  logger.info('Shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions and rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled Rejection:', error);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Connect to Redis
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Test database connection
    await prisma.$connect();
    logger.info('Connected to PostgreSQL');

    app.listen(PORT, () => {
      logger.info(`Auth service running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        port: PORT,
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
