import { env } from './env.js';

/**
 * Serper API configuration
 * Provides configuration for Serper search API
 */
export const serperConfig = {
  /**
   * Serper API key for search requests
   */
  apiKey: env.SERPER_API_KEY,
  
  /**
   * Base URL for Serper API
   */
  baseUrl: 'https://google.serper.dev',
  
  /**
   * Default number of search results
   */
  defaultNumResults: 10,
  
  /**
   * Maximum number of search results allowed
   */
  maxNumResults: 20,
  
  /**
   * Request timeout in milliseconds
   */
  timeout: 10000,
} as const;

/**
 * Validates Serper configuration
 * @returns true if configuration is valid
 */
export const validateSerperConfig = (): boolean => {
  if (!serperConfig.apiKey) {
    console.warn('SERPER_API_KEY is not set. Search functionality will be disabled.');
    return false;
  }
  return true;
};
