import { createClient } from 'redis';
import { Server } from 'socket.io';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
});

export const redisSubscriber = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

redisSubscriber.on('error', (err) => {
  console.error('Redis Subscriber Error:', err);
});

export async function subscribeToChannels(io: Server) {
  await redisSubscriber.connect();

  // Subscribe to new message pattern
  await redisSubscriber.pSubscribe('new_message:*', (message, channel) => {
    try {
      const data = JSON.parse(message);
      const userId = channel.split(':')[1];

      // Emit to user's room
      io.to(`user:${userId}`).emit('new_message', data);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Subscribe to message status updates
  await redisSubscriber.pSubscribe('message_status:*', (message, channel) => {
    try {
      const data = JSON.parse(message);
      const userId = channel.split(':')[1];

      // Emit status update to user's room
      io.to(`user:${userId}`).emit('message_status', data);
    } catch (error) {
      console.error('Error processing status update:', error);
    }
  });

  console.log('Redis subscriber connected and listening');
}