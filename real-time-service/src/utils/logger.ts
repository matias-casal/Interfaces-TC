import { initializeLogger } from './sharedLogger';

const { logger, loggerHelper } = initializeLogger('real-time-service');

export { logger, loggerHelper };