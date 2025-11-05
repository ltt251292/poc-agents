import pino from 'pino';
import { env } from '../config/env.js';

/**
 * Logger configuration cho ứng dụng
 * Sử dụng Pino để log các thông tin quan trọng
 */
const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    }
  } : undefined,
});

export default logger;

