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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

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
  console.log('Shutting down gracefully...');
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
    console.log('Connected to Redis');

    // Test database connection
    await prisma.$connect();
    console.log('Connected to PostgreSQL');

    app.listen(PORT, () => {
      console.log(`Messaging service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();