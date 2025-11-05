import { config } from 'dotenv';

// Load environment variables from .env file
config();

/**
 * Environment configuration
 * Loads and exports all environment variables with defaults
 */
export const env = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Logger Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // MongoDB Configuration
  MONGODB_URL: process.env.MONGODB_URL || 'mongodb://localhost:27017',
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'open-routers',
  
  // LangSmith Configuration
  LANGSMITH_API_KEY: process.env.LANGSMITH_API_KEY || '',
  
  // OpenAI Configuration
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',

  // Serper Configuration
  SERPER_API_KEY: process.env.SERPER_API_KEY || '',
} as const;

