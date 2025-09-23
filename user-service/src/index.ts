import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error';
import { userRouter } from './routes/users';
import { healthRouter } from './routes/health';
import { redisClient } from './config/redis';
import { prisma } from './config/database';
import { logger, loggerHelper } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Trust proxy - required for X-Forwarded headers from Nginx
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/health', healthRouter);
app.use('/users', userRouter);

// Error handling
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async () => {
  loggerHelper.logShutdown('SIGTERM/SIGINT received');
  await prisma.$disconnect();
  await redisClient.quit();
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

    // Test database connection
    await prisma.$connect();
    logger.info('Connected to PostgreSQL');

    app.listen(PORT, () => {
      loggerHelper.logStartup(Number(PORT));
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
