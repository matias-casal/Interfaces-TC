import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { Request } from 'express';
import path from 'path';

// Logger configuration interface
interface LoggerConfig {
  service: string;
  environment?: string;
  logLevel?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  logDir?: string;
}


// Custom log format with consistent structure
const customFormat = winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
  const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
  return `${timestamp} [${service}] ${level}: ${message} ${metaString}`;
});

// Create logger instance with consistent configuration
export function createLogger(config: LoggerConfig): winston.Logger {
  const {
    service,
    environment = process.env.NODE_ENV || 'development',
    logLevel = environment === 'production' ? 'info' : 'debug',
    enableConsole = true,
    enableFile = environment === 'production',
    logDir = 'logs',
  } = config;

  const transports: winston.transport[] = [];

  // Console transport with color coding
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      })
    );
  }

  // File transport with daily rotation
  if (enableFile) {
    // Error logs
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, `${service}-error-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
      })
    );

    // Combined logs
    transports.push(
      new DailyRotateFile({
        filename: path.join(logDir, `${service}-combined-%DATE%.log`),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        zippedArchive: true,
      })
    );
  }

  return winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
      customFormat
    ),
    defaultMeta: { service, environment },
    transports,
    exitOnError: false,
  });
}

// Express request logger middleware
export function createRequestLogger(logger: winston.Logger) {
  return (
    req: Request & { requestId?: string; userId?: string; user?: any },
    res: any,
    next: any
  ) => {
    const startTime = Date.now();
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Attach request ID to request object
    req.requestId = requestId;

    // Log request
    logger.info('Incoming request', {
      requestId,
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.userId || req.user?.id,
    });

    // Log response
    const originalSend = res.send;
    res.send = function (data: any) {
      const duration = Date.now() - startTime;

      logger.info('Request completed', {
        requestId,
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        userId: req.userId || req.user?.id,
      });

      // Log error responses
      if (res.statusCode >= 400) {
        logger.error('Request error', {
          requestId,
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          error: data,
          userId: req.userId || req.user?.id,
        });
      }

      // Log slow requests
      if (duration > 1000) {
        logger.warn('Slow request detected', {
          requestId,
          method: req.method,
          url: req.url,
          duration,
          userId: req.userId || req.user?.id,
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

// Structured logging helper functions
export class LoggerHelper {
  private logger: winston.Logger;

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  // Log service startup
  logStartup(port: number, additionalInfo?: any) {
    this.logger.info(`Service started on port ${port}`, {
      event: 'service_start',
      port,
      ...additionalInfo,
    });
  }

  // Log service shutdown
  logShutdown(reason?: string) {
    this.logger.info('Service shutting down', {
      event: 'service_shutdown',
      reason,
    });
  }

  // Log database operations
  logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    error?: any
  ) {
    const logData = {
      event: 'database_operation',
      operation,
      table,
      duration,
      success,
    };

    if (success) {
      this.logger.debug(`Database operation: ${operation} on ${table}`, logData);
    } else {
      this.logger.error(`Database operation failed: ${operation} on ${table}`, {
        ...logData,
        error: error?.message || error,
      });
    }
  }

  // Log cache operations
  logCacheOperation(operation: string, key: string, hit: boolean, duration?: number) {
    this.logger.debug(`Cache ${operation}: ${key}`, {
      event: 'cache_operation',
      operation,
      key,
      hit,
      duration,
    });
  }

  // Log external API calls
  logApiCall(
    service: string,
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number
  ) {
    const logData = {
      event: 'external_api_call',
      service,
      endpoint,
      method,
      statusCode,
      duration,
    };

    if (statusCode < 400) {
      this.logger.info(`API call to ${service}: ${method} ${endpoint}`, logData);
    } else {
      this.logger.error(`API call failed to ${service}: ${method} ${endpoint}`, logData);
    }
  }

  // Log authentication events
  logAuth(
    event: 'login' | 'logout' | 'register' | 'token_refresh',
    userId: string,
    success: boolean,
    metadata?: any
  ) {
    const logData = {
      event: `auth_${event}`,
      userId,
      success,
      ...metadata,
    };

    if (success) {
      this.logger.info(`Authentication event: ${event}`, logData);
    } else {
      this.logger.warn(`Authentication event failed: ${event}`, logData);
    }
  }

  // Log message operations
  logMessage(
    event: 'sent' | 'delivered' | 'read' | 'encrypted' | 'decrypted',
    messageId: string,
    metadata?: any
  ) {
    this.logger.info(`Message ${event}`, {
      event: `message_${event}`,
      messageId,
      ...metadata,
    });
  }

  // Log WebSocket events
  logWebSocket(
    event: 'connection' | 'disconnect' | 'message' | 'error',
    socketId: string,
    userId?: string,
    metadata?: any
  ) {
    const logData = {
      event: `websocket_${event}`,
      socketId,
      userId,
      ...metadata,
    };

    if (event === 'error') {
      this.logger.error(`WebSocket error`, logData);
    } else {
      this.logger.info(`WebSocket ${event}`, logData);
    }
  }

  // Log rate limiting events
  logRateLimit(userId: string, endpoint: string, limited: boolean) {
    if (limited) {
      this.logger.warn('Rate limit exceeded', {
        event: 'rate_limit_exceeded',
        userId,
        endpoint,
      });
    }
  }

  // Log performance metrics
  logPerformance(metric: string, value: number, unit: string = 'ms', metadata?: any) {
    this.logger.info(`Performance metric: ${metric}`, {
      event: 'performance_metric',
      metric,
      value,
      unit,
      ...metadata,
    });
  }

  // Log security events
  logSecurity(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any) {
    const logData = {
      event: `security_${event}`,
      severity,
      ...details,
    };

    switch (severity) {
      case 'critical':
      case 'high':
        this.logger.error(`Security event: ${event}`, logData);
        break;
      case 'medium':
        this.logger.warn(`Security event: ${event}`, logData);
        break;
      default:
        this.logger.info(`Security event: ${event}`, logData);
    }
  }
}

// Export a function to create consistent logger across all services
export function initializeLogger(serviceName: string): {
  logger: winston.Logger;
  loggerHelper: LoggerHelper;
} {
  const logger = createLogger({
    service: serviceName,
    environment: process.env.NODE_ENV,
    logLevel: process.env.LOG_LEVEL,
    enableFile: process.env.NODE_ENV === 'production',
    logDir: process.env.LOG_DIR || 'logs',
  });

  const loggerHelper = new LoggerHelper(logger);

  return { logger, loggerHelper };
}

// Graceful shutdown helper
export function setupGracefulShutdown(logger: winston.Logger, serviceName: string) {
  const shutdown = (signal: string) => {
    logger.info(`${serviceName} received ${signal} signal, starting graceful shutdown`, {
      event: 'graceful_shutdown',
      signal,
    });

    // Give winston time to flush logs
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', {
      event: 'uncaught_exception',
      error: error.message,
      stack: error.stack,
    });
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', {
      event: 'unhandled_rejection',
      reason,
      promise,
    });
    shutdown('unhandledRejection');
  });
}

// Backwards compatibility - Maintain original exports
export const requestLogger = (service: string) => {
  const { logger } = initializeLogger(service);
  return createRequestLogger(logger);
};

// Export logger levels
export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  VERBOSE: 'verbose',
} as const;
