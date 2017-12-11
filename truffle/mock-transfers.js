
module.exports = async (callback) => {
  try {
    const random = require('random-js')();
    const DizzyToken = artifacts.require('./DizzyToken.sol');
    console.log('######################################################################');
    console.log(`# DEPLOYED TOKEN ADDRESS: ${DizzyToken.address} #`);
    console.log('######################################################################');
    const dizzyToken = await DizzyToken.deployed();
    setTimeout(timeoutFn, 5000, web3, random, dizzyToken);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

async function timeoutFn(web3, random, dizzyToken) {
  try {
    await transfer(web3, random, dizzyToken);
    const timeout = random.integer(200, 2500);
    setTimeout(timeoutFn, timeout, web3, random, dizzyToken);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

async function transfer(web3, random, dizzyToken) {
  const to = web3.eth.accounts[random.integer(1, web3.eth.accounts.length - 1)];
  const value = random.integer(1, 1000);
  await dizzyToken.transfer(to, value);
}
