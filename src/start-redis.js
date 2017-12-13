const logger = require('./logger');
const RedisServer = require('redis-server');

async function main() {
  const server = new RedisServer();
  server.open((error) => {
    if (error !== null) {
      logger.error(`Failed to initialize Redis development server: ${error.stack}.`);
      process.exit(1);
    }
    logger.info(`Redis development server running on port: ${server.config.port}.`);
  });
}

if (require.main === module) {
  main();
}
