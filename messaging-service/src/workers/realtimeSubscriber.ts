import { redisSubscriber } from '../config/redis';
import { messageService } from '../services/messages';
import { logger } from '../utils/logger';

interface DeliveryPayload {
  userId: string;
  messageIds: string[];
}

const isValidPayload = (payload: any): payload is DeliveryPayload => {
  return Boolean(payload && typeof payload.userId === 'string' && Array.isArray(payload.messageIds));
};

export const startRealtimeSubscriber = async () => {
  await redisSubscriber.connect();

  await redisSubscriber.subscribe('message_delivery', async (rawMessage) => {
    try {
      const payload = JSON.parse(rawMessage) as DeliveryPayload;
      if (!isValidPayload(payload)) {
        logger.warn('Invalid delivery payload received', { rawMessage });
        return;
      }

      await messageService.markAsDelivered(payload.messageIds, payload.userId);
    } catch (error) {
      logger.error('Failed to process delivery event', { error });
    }
  });

  await redisSubscriber.subscribe('message_read', async (rawMessage) => {
    try {
      const payload = JSON.parse(rawMessage) as DeliveryPayload;
      if (!isValidPayload(payload)) {
        logger.warn('Invalid read payload received', { rawMessage });
        return;
      }

      await messageService.markAsRead(payload.messageIds, payload.userId);
    } catch (error) {
      logger.error('Failed to process read event', { error });
    }
  });

  logger.info('Subscribed to real-time status events');
};

export const stopRealtimeSubscriber = async () => {
  try {
    if (!redisSubscriber.isOpen) {
      return;
    }

    await redisSubscriber.unsubscribe('message_delivery');
    await redisSubscriber.unsubscribe('message_read');
    await redisSubscriber.quit();
  } catch (error) {
    logger.error('Failed to stop real-time subscriber', { error });
  }
};
