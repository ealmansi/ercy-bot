const logger = require('../logger');
const moment = require('moment');
const promiseRetry = require('promise-retry');

const DEFAULT_POLL_INTERVAL = moment.duration(1, 'second').asMilliseconds();
const DEFAULT_BACK_OFF_INTERVAL = moment.duration(10, 'minutes').asMilliseconds();
const DEFAULT_MAX_RETRIES = 5;

class PollingWithRetry {
  /**
   * Executes the given action at regular intervals without reentrancy. During each
   * poll interval, the action is tried multiple times in case of failure until it
   * finishes successfully, or the max number of retries is reached.
   * @constructor
   * @param {AsyncFunction} action - Action to repeat during each poll interval.
   * @param {Number} pollInterval - Milliseconds to wait before repeating the given action.
   * @param {Number} backOffInterval - Milliseconds to wait before retrying on repeated failures.
   * @param {Number} maxRetries - Maximum number of retries per poll interval.
   */
  constructor(
    action,
    pollInterval = DEFAULT_POLL_INTERVAL,
    backOffInterval = DEFAULT_BACK_OFF_INTERVAL,
    maxRetries = DEFAULT_MAX_RETRIES,
  ) {
    this.action = action;
    this.pollInterval = pollInterval;
    this.backOffInterval = backOffInterval;
    this.maxRetries = maxRetries;
  }

  /**
   * Start executing the action at regular intervals.
   */
  start() {
    this.scheduleAction(0);
  }

  /**
   * Schedules a future execution of the given action.
   * @param {Number} timeout - Milliseconds to wait before running action.
   */
  scheduleAction(timeout) {
    setTimeout(() => {
      const opts = { retries: this.maxRetries };
      promiseRetry(async (retry) => {
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
        .catch((error) => {
          PollingWithRetry.logRetryError(error);
          this.scheduleAction(this.backOffInterval);
        });
    }, timeout);
  }

  /**
   * Logs the error which ocurred during the last attempt to execute the action,
   * indicating the beginning of the back-off period.
   * @param {Error} error - Error thrown during the last action attempt.
   */
  static logRetryError(error) {
    logger.error([
      'Failed after multiple attempts. Trying again in a few minutes.',
      `Last error: ${error.stack}.`,
    ].join(' '));
  }
}

module.exports = PollingWithRetry;
