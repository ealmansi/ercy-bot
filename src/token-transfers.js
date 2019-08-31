/* global artifacts web3 */

const Random = require('random-js');
const logger = require('./logger');

async function transfer(web3, random, dizzyToken) {
  const from = web3.eth.accounts[0];
  const to = web3.eth.accounts[random.integer(1, web3.eth.accounts.length - 1)];
  const value = random.integer(1, 1000);
  await dizzyToken.transfer(to, value);
  const message = [
    `Generated a token transfer from ${from.substr(0, 8)}...`,
    `to ${to.substr(0, 8)}... for ${value / 100} DZN.`,
  ].join(' ');
  logger.info(message);
}

async function timeoutFn(web3, random, dizzyToken) {
  try {
    await transfer(web3, random, dizzyToken);
    const timeout = random.integer(200, 2500);
    setTimeout(timeoutFn, timeout, web3, random, dizzyToken);
  } catch (err) {
    logger.error(err);
    setTimeout(process.exit, 3000, 1);
  }
}

module.exports = async () => {
  try {
    const random = Random();
    const DizzyToken = artifacts.require('./DizzyToken.sol');
    const dizzyToken = await DizzyToken.deployed();
    setTimeout(timeoutFn, 5000, web3, random, dizzyToken);
  } catch (err) {
    logger.error(err);
    setTimeout(process.exit, 3000, 1);
  }
};
