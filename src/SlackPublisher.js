const logger = require('./logger');
const moment = require('moment')
const promiseRetry = require('promise-retry');
const PollingWithRetry = require('./PollingWithRetry')

const DISPLAY_PREFIX_LENGTH = 8;

class SlackPublisher {
  
  constructor(slack, channelId, explorerBaseUrls, db) {
    this.slack = slack;
    this.channelId = channelId;
    this.explorerBaseUrls = explorerBaseUrls;
    this.db = db;
  }

  start() {
    logger.info('Starting Slack publisher.');
    new PollingWithRetry(this.handleTransfer.bind(this)).start();
  }

  async handleTransfer() {
    const transfer = await this.db.nextTransfer();
    if (transfer === null) {
      return;
    }
    const message = this.buildMessage(transfer);
    await this.sendMessage(message);
    await this.db.removeTransfer(transfer);
  }

  buildMessage(transfer) {
    const { transactionHash, from, to, value, unit } = transfer;
    const fromLink = this.makeAddressLink(from);
    const toLink = this.makeAddressLink(to);
    const transactionHashLink = this.makeTransactionHashLink(transactionHash);
    return `${fromLink} sent ${value} ${unit} to ${toLink}! (tx: ${transactionHashLink}).`;
  }

  makeAddressLink(address) {
    const link = `${this.explorerBaseUrls.address}/${address}`;
    const text = `${address.substr(0, DISPLAY_PREFIX_LENGTH)}...`;
    return `<${link}|${text}>`;
  }

  makeTransactionHashLink(hash) {
    const link = `${this.explorerBaseUrls.transaction}/${hash}`;
    const text = `${hash.substr(0, DISPLAY_PREFIX_LENGTH)}...`;
    return `<${link}|${text}>`;
  }

  async sendMessage(message) {
    const { ok, error } = await this.slack.apiAsync('chat.postMessage', {
      as_user: true,
      text: message,
      channel: this.channelId
    });
    if (!ok) {
      throw new Error(`Slack API Error: ${error}.`);
    }
    logger.info(`Message sent to Slack successfully: \"${message}\".`);
  }
};

module.exports = SlackPublisher;
