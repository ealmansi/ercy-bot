const logger = require('./logger');
const Promise = require('bluebird');
const RedisServer = require('redis-server');
const redis = Promise.promisifyAll(require('redis'));

class DatabaseClient {
  
  constructor(redisClient) {
    this.redisClient = redisClient;
  }

  async pushEvent(eventId) {
    await this.redisClient.rpushAsync('events', eventId);
  }

  async peekEvent() {
    let [ eventId ] = await this.redisClient.lrangeAsync('events', 0, 0);
    return eventId;
  }

  async popEvent() {
    await this.redisClient.lpop('events');
  }
};

class DatabaseFactory {

  static setup(env) {
    if (env === 'development') {
      logger.info('Starting Redis development server.');
      return new Promise((resolve, reject) => {
        const server = new RedisServer();
        server.open((err) => {
          if (err !== null) {
            reject(err);
          }
          resolve();
        });
      });
    }
    return Promise.resolve();
  }

  static createClient() {
    return new Promise((resolve, reject) => {
      const redisClient = redis.createClient();
      redisClient.on('ready', () => resolve(new DatabaseClient(redisClient)));
      redisClient.on('error', reject);
    });
  }
};

module.exports = DatabaseFactory;
