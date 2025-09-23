// Test setup file for user-service
import { beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRE_TIME = '1h';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.INTERNAL_SERVICE_TOKEN = 'test-internal-token';
process.env.NODE_ENV = 'test';

// Suppress console logs during tests
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

// Clear all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Restore console after all tests
afterAll(() => {
  jest.restoreAllMocks();
});
