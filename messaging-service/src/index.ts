import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error';
import { messageRouter } from './routes/messages';
import { chatRouter } from './routes/chats';
import { healthRouter } from './routes/health';
import { redisClient } from './config/redis';
import { prisma } from './config/database';
import { logger } from './utils/logger';
import { startRealtimeSubscriber, stopRealtimeSubscriber } from './workers/realtimeSubscriber';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Trust proxy - required for X-Forwarded headers from Nginx
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/health', healthRouter);
app.use('/messages', messageRouter);
app.use('/chats', chatRouter);

// Error handling
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  await stopRealtimeSubscriber();
  await redisClient.quit();
  logger.info('Shutdown complete');
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    // Connect to Redis
    await redisClient.connect();
    logger.info('Connected to Redis');

    await startRealtimeSubscriber();
    logger.info('Real-time subscriber ready');

    // Test database connection
    await prisma.$connect();
    logger.info('Connected to PostgreSQL');

    app.listen(PORT, () => {
      logger.info(`Messaging service running on port ${PORT}`, {
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
