const logger = require('./logger');
const moment = require('moment');
const promiseRetry = require('promise-retry');

const DEFAULT_POLL_INTERVAL = moment.duration(1, 'second').asMilliseconds();
const DEFAULT_BACK_OFF_INTERVAL = moment.duration(10, 'minutes').asMilliseconds();
const DEFAULT_MAX_RETRIES = 5;

class PollingWithRetry {

  constructor(action,
        pollInterval = DEFAULT_POLL_INTERVAL,
        backOffInterval = DEFAULT_BACK_OFF_INTERVAL,
        maxRetries = DEFAULT_MAX_RETRIES) {
    this.action = action;
    this.pollInterval = pollInterval;
    this.backOffInterval = backOffInterval;
    this.maxRetries = maxRetries;
  }

  start() {
    this.scheduleAction(0);
  }

  scheduleAction(timeout) {
    setTimeout(() => {
      const opts = { retries: this.maxRetries };
      promiseRetry(async retry => {
        try {
          await this.action();
        } catch (error) {
          logger.error(error);
          retry(error);
        }
      }, opts)
      .then(() => {
        this.scheduleAction(this.pollInterval);
      })
      .catch(error => {
        this.logRetryError(error);
        this.scheduleAction(this.backOffInterval);
      });
    }, timeout);
  }

  logRetryError(error) {
    logger.error([
      'Failed after multiple attempts. Trying again in a few minutes.',
      `Last error: ${error.stack}.`
    ].join(' '));
  }
}

module.exports = PollingWithRetry;
