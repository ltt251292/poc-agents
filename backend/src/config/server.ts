import { env } from './env.js';

/**
 * Server configuration
 * Contains server-related settings
 */
export const serverConfig = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
} as const;

