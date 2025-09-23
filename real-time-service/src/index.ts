import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { JWTUtils } from './utils/jwt';
import { redisClient, subscribeToChannels } from './config/redis';
import { setupSocketHandlers } from './handlers/socket';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', async (_req, res) => {
  try {
    const redisPing = await redisClient.ping();
    res.json({
      status: 'healthy',
      service: 'real-time-service',
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: redisPing === 'PONG' ? 'connected' : 'disconnected'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'real-time-service',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.IO middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = JWTUtils.verify(token);
    socket.data.user = payload;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Setup socket handlers
setupSocketHandlers(io);

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down gracefully...');
  io.close();
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

    // Subscribe to Redis channels
    await subscribeToChannels(io);
    console.log('Subscribed to Redis channels');

    httpServer.listen(PORT, () => {
      console.log(`Real-time service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();