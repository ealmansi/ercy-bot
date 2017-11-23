const logger = require('./logger');
const moment = require('moment')
const promiseRetry = require('promise-retry');

const MAX_RETRIES = 5;
const POLL_INTERVAL = moment.duration(500).asMilliseconds();
const BACK_OFF_INTERVAL = moment.duration(10, 'minutes').asMilliseconds();

class SlackPublisher {
  
  constructor(slack, botId, channelId, db) {
    this.slack = slack;
    this.botId = botId;
    this.channelId = channelId;
    this.db = db;
  }

  start() {
    logger.info('Starting Slack publisher.');
    this.schedulePublish(0);
  }

  schedulePublish(timeout) {
    setTimeout(() => {
      try {
        const opts = { minTimeout: 0, retries: MAX_RETRIES };
        promiseRetry(this.publishOrRetry.bind(this), opts)
        .then(this.onPromiseRetrySuccess.bind(this),
              this.onPromiseRetryFailure.bind(this));
      }
      catch (error) {
        logger.error(`Unexpected error during scheduling: ${JSON.stringify(error)}.`);
        this.schedulePublish(BACK_OFF_INTERVAL);
      }
    }, timeout);
  }

  onPromiseRetrySuccess() {
    this.schedulePublish(POLL_INTERVAL);
  }

  onPromiseRetryFailure(error) {
    const message = [
      'Failed to publish to Slack after multiple attempts.',
      `Error: ${JSON.stringify(error)}. Trying again in 10 minutes.`
    ].join(' ');
    logger.error(message);
    this.schedulePublish(BACK_OFF_INTERVAL);
  }

  async publishOrRetry(retry) {
    try {
      let eventId = await this.db.peekEvent();
      while (eventId) {
        const { ok, error } = await this.sendMessage(eventId);
        if (!ok) {
          logger.error(`Slack API Error: ${error}.`)
          retry(error);
        }
        logger.info(`Sent message to Slack successfully: ${eventId}.`);
        this.db.popEvent();
        eventId = await this.db.peekEvent();
      }
    }
    catch (error) {
      logger.error(`Unexpected error during publishing: ${JSON.stringify(error)}.`);
      retry(error);
    }
  }

  async sendMessage(message) {
    return await this.slack.apiAsync('chat.postMessage', {
      as_user: true,
      text: message,
      channel: this.channelId
    });
  }
};

module.exports = SlackPublisher;
