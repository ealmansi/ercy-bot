const Promise = require('bluebird');
const redis = Promise.promisifyAll(require('redis'));
const DatabaseClient = require('./DatabaseClient');

class DatabaseFactory {
  static createClient(namespace, cacheTtl) {
    return new Promise((resolve, reject) => {
      const redisClient = redis.createClient();
      redisClient.on('ready', () => {
        resolve(new DatabaseClient(namespace, cacheTtl, redisClient));
      });
      redisClient.on('error', reject);
    });
  }
}

module.exports = DatabaseFactory;
