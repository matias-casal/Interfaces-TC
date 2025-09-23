import { initializeLogger } from './sharedLogger';

const { logger, loggerHelper } = initializeLogger('user-service');

export { logger, loggerHelper };