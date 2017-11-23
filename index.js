const config = require('config');
const logger = require('./src/logger');
const Promise = require('bluebird');
const Web3 = require('web3');
const Slack = require('slack-node');
const DatabaseFactory = require('./src/DatabaseFactory');
const ContractListener = require('./src/ContractListener');
const SlackPublisher = require('./src/SlackPublisher');

async function main() {
  try {
    logger.info(`Launching ${config.get('appName')}.`);
    const db = await DatabaseFactory.createClient();
    const contractListener = buildContractListener(db);
    const slackPublisher = buildSlackPublisher(db);
    contractListener.start();
    slackPublisher.start();
  }
  catch (error) {
    logger.error(`Launch failed: ${error}.`);
    process.exit(1);
  }
}

function buildContractListener(db) {
  const contract = config.get('contract');
  const abi = config.get('abi');
  const web3Host = config.get('web3.host');
  const web3 = new Web3(new Web3.providers.HttpProvider(web3Host));
  return new ContractListener(contract, abi, web3, db);
}

function buildSlackPublisher(db) {
  const token = config.get('slack.token');
  const slack = Promise.promisifyAll(new Slack(token));
  const botId = config.get('slack.botId');
  const channelId = config.get('slack.channelId');
  return new SlackPublisher(slack, botId, channelId, db);
}

if (require.main === module) {
  main();
}
