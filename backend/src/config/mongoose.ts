import mongoose from 'mongoose';
import logger from '../logger/index.js';
import { databaseConfig } from './database.js';

/**
 * Connect to MongoDB using Mongoose
 */
export async function connectMongoose(): Promise<void> {
  try {
    // Build URI: allow passing full URI in url, otherwise append dbName
    logger.info({ databaseConfig }, 'Database configuration');
    const uri = databaseConfig.url + "/" + databaseConfig.dbName;
    logger.info({ url: databaseConfig.url }, 'Connecting to MongoDB');
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    const { host, port, name } = mongoose.connection;
    logger.info({ host, port, name }, '✅ Connected to MongoDB (mongoose)');

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️  Mongoose disconnected');
    });
    mongoose.connection.on('error', (err: Error) => {
      logger.error({ err }, '❌ Mongoose connection error');
    });
  } catch (error) {
    logger.error({ error }, 'Failed to connect to MongoDB');
    throw error;
  }
}


