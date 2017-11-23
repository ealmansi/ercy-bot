const Promise = require('bluebird');
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

  static createClient() {
    return new Promise((resolve, reject) => {
      const redisClient = redis.createClient();
      redisClient.on('ready', () => resolve(new DatabaseClient(redisClient)));
      redisClient.on('error', reject);
    });
  }
};

module.exports = DatabaseFactory;
