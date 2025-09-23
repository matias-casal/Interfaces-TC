import type { Server, Socket } from 'socket.io';
import { redisClient } from '../config/redis';
import { MessageStatus } from '../types';

export function setupSocketHandlers(io: Server) {
  io.on('connection', async (socket: Socket) => {
    const userId = socket.data.user.id;
    console.log(`User ${userId} connected`);

    // Join user's personal room
    await socket.join(`user:${userId}`);

    // Notify other services that user is online
    await redisClient.set(`user:online:${userId}`, 'true', { EX: 300 });

    // Handle marking messages as delivered
    socket.on('mark_delivered', async (messageIds: string[]) => {
      try {
        // Publish delivery confirmation
        await redisClient.publish(
          'message_delivery',
          JSON.stringify({
            userId,
            messageIds,
            status: MessageStatus.DELIVERED
          })
        );

        socket.emit('delivery_confirmed', { messageIds });
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark messages as delivered' });
      }
    });

    // Handle marking messages as read
    socket.on('mark_read', async (messageIds: string[]) => {
      try {
        // Publish read receipt
        await redisClient.publish(
          'message_read',
          JSON.stringify({
            userId,
            messageIds,
            status: MessageStatus.READ
          })
        );

        socket.emit('read_confirmed', { messageIds });
      } catch (error) {
        socket.emit('error', { message: 'Failed to mark messages as read' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', async (data: { receiverId: string }) => {
      const receiverId = data.receiverId || data;
      console.log(`User ${userId} started typing to ${receiverId}`);

      // Emit to receiver's room
      io.to(`user:${receiverId}`).emit('user_typing', {
        userId,
        typing: true
      });

      // Also publish to Redis for other instances
      await redisClient.publish(
        `typing:${receiverId}`,
        JSON.stringify({ userId, typing: true })
      );
    });

    socket.on('typing_stop', async (data: { receiverId: string }) => {
      const receiverId = data.receiverId || data;
      console.log(`User ${userId} stopped typing to ${receiverId}`);

      // Emit to receiver's room
      io.to(`user:${receiverId}`).emit('user_typing', {
        userId,
        typing: false
      });

      // Also publish to Redis for other instances
      await redisClient.publish(
        `typing:${receiverId}`,
        JSON.stringify({ userId, typing: false })
      );
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User ${userId} disconnected`);

      // Mark user as offline
      await redisClient.del(`user:online:${userId}`);

      // Leave all rooms
      socket.rooms.clear();
    });

    // Send pending messages on connection
    const pendingKey = `pending:${userId}`;
    const pendingMessages = await redisClient.lRange(pendingKey, 0, -1);

    if (pendingMessages.length > 0) {
      for (const message of pendingMessages) {
        socket.emit('new_message', JSON.parse(message));
      }

      // Clear pending messages
      await redisClient.del(pendingKey);
    }
  });
}