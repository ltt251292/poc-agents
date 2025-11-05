import app from './server.js';
import { serverConfig } from './config/index.js';
import { connectMongoose } from './config/mongoose.js';
import logger from './logger/index.js';

/**
 * Start the Express server
 */
async function start() {
  try {
    await connectMongoose();

    app.listen(serverConfig.port, () => {
      logger.info({
        port: serverConfig.port,
        environment: serverConfig.nodeEnv,
      }, '🚀 Server is running');
      
      logger.info(`🌐 Web Client: http://localhost:${serverConfig.port}`);
      logger.info(`📡 API endpoints:`);
      logger.info(`   - POST http://localhost:${serverConfig.port}/api/agent/chat`);
      logger.info(`   - GET  http://localhost:${serverConfig.port}/api/health`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

start();