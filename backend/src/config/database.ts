import { env } from './env.js';

/**
 * Database configuration
 * Contains MongoDB connection settings
 */
export const databaseConfig = {
  url: env.MONGODB_URL,
  dbName: env.MONGODB_DB_NAME,
} as const;

