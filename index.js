const config = require('config');
const logger = require('./src/logger');
const moment = require('moment');
const Promise = require('bluebird');
const Web3 = require('web3');
const Slack = require('slack-node');
const DatabaseFactory = require('./src/DatabaseFactory');
const BlockchainListener = require('./src/BlockchainListener');
const SlackPublisher = require('./src/SlackPublisher');

const LAUNCH_ERROR_EXIT_CODE = 1;
const TIMEOUT_BEFORE_EXIT = moment.duration(3, 'seconds').asMilliseconds();

async function buildDatabaseClient() {
  const namespace = config.get('db.namespace');
  const cacheTtl = config.get('db.cacheTtl');
  return DatabaseFactory.createClient(namespace, cacheTtl);
}

function buildBlockchainListener(db) {
  const contracts = config.get('eth.contracts');
  const abi = config.get('eth.abi');
  const web3Host = config.get('eth.web3.host');
  const web3 = new Web3(new Web3.providers.HttpProvider(web3Host));
  Promise.promisifyAll(web3.eth);
  return new BlockchainListener(contracts, abi, web3, db);
}

function buildSlackPublisher(db) {
  const token = config.get('slack.token');
  const channelId = config.get('slack.channelId');
  const slack = Promise.promisifyAll(new Slack(token));
  if (config.has('slack.mock')) {
    slack.url = config.get('slack.mock.host');
  }
  const explorerBaseUrls = config.get('eth.explorerBaseUrls');
  return new SlackPublisher(slack, channelId, explorerBaseUrls, db);
}

async function main() {
  try {
    logger.info(`Launching ${config.get('appName')}.`);
    const db = await buildDatabaseClient();
    buildBlockchainListener(db).start();
    buildSlackPublisher(db).start();
  } catch (error) {
    logger.error(`Failed to launch application. Error: ${error.stack}.`);
    setTimeout(process.exit, TIMEOUT_BEFORE_EXIT, LAUNCH_ERROR_EXIT_CODE);
  }
}

if (require.main === module) {
  process.on('unhandledRejection', logger.error);
  main();
}
