const logger = require('../logger');
const PollingWithRetry = require('./PollingWithRetry');

const DISPLAY_PREFIX_LENGTH = 8;

class SlackPublisher {
  /**
   * @constructor
   * @param {Slack} slack - Promisified Slack client.
   * @param {string} channelId - Id of channel where messages will be sent.
   * @param {Object} explorerBaseUrls - Base explorer urls for addresses and txs.
   * @param {DatabaseClient} db - Database client.
   */
  constructor(slack, channelId, explorerBaseUrls, db) {
    this.slack = slack;
    this.channelId = channelId;
    this.explorerBaseUrls = explorerBaseUrls;
    this.db = db;
  }

  /**
   * Starts polling for pending transactions to publish.
   */
  start() {
    logger.info('Starting Slack publisher.');
    new PollingWithRetry(this.handleTransfer.bind(this)).start();
  }

  /**
   * Tries to publish the next pending transaction.
   */
  async handleTransfer() {
    const transfer = await this.db.nextTransfer();
    if (transfer === null) {
      return;
    }
    const message = this.buildMessage(transfer);
    await this.sendMessage(message);
    await this.db.removeTransfer(transfer);
  }

  /**
   * Builds a Slack message detailing the given token transfer.
   * @param {Object} transfer - Token transfer to publish.
   * @returns {string}
   */
  buildMessage(transfer) {
    const { transactionHash, from, to, value, unit } = transfer;
    const fromLink = this.makeAddressLink(from);
    const toLink = this.makeAddressLink(to);
    const transactionHashLink = this.makeTransactionHashLink(transactionHash);
    return `${fromLink} sent ${value} ${unit} to ${toLink}! (tx: ${transactionHashLink}).`;
  }

  /**
   * Creates a formatted link to display the given address.
   * @param {string} address - Ethereum address.
   */
  makeAddressLink(address) {
    const link = `${this.explorerBaseUrls.address}/${address}`;
    const text = `${address.substr(0, DISPLAY_PREFIX_LENGTH)}...`;
    return `<${link}|${text}>`;
  }

  /**
   * Creates a formatted link to display the given transaction hash.
   * @param {string} transactionHash - Ethereum transaction hash.
   */
  makeTransactionHashLink(transactionHash) {
    const link = `${this.explorerBaseUrls.transaction}/${transactionHash}`;
    const text = `${transactionHash.substr(0, DISPLAY_PREFIX_LENGTH)}...`;
    return `<${link}|${text}>`;
  }

  /**
   * Sends the given message to the Slack API as the bot user.
   * @param {string} message - Message to be sent to Slack.
   */
  async sendMessage(message) {
    const { ok, error } = await this.slack.apiAsync('chat.postMessage', {
      as_user: true,
      text: message,
      channel: this.channelId,
    });
    if (!ok) {
      throw new Error(`Slack API Error: ${error}.`);
    }
    logger.info(`Message sent to Slack successfully: "${message}".`);
  }
}

module.exports = SlackPublisher;
