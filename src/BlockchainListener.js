const logger = require('./logger');
const Promise = require('bluebird');
const PollingWithRetry = require('./PollingWithRetry');
const BigNumber = require('bignumber.js');

const MIN_CONFIRMATIONS = 12;

class BlockchainListener {
  /**
   * @constructor
   * @param {Array} contracts - Contracts to listen for.
   * @param {Object} abi - ABI followed by the given contracts.
   * @param {Web3} web3 - Promisfied Web3 ethereum client.
   * @param {DatabaseClient} db - Database client.
   */
  constructor(contracts, abi, web3, db) {
    if (contracts.length === 0) {
      throw new Error('Missing contracts to listen for.');
    }
    this.contracts = contracts;
    this.contractInstances = contracts.map(contract =>
      web3.eth.contract(abi).at(contract.address));
    this.abi = abi;
    this.web3 = web3;
    this.db = db;
  }

  /**
   * Starts polling for incoming token transfers in the given contracts.
   */
  start() {
    logger.info('Starting blockchain listener.');
    new PollingWithRetry(this.handlePendingBlock.bind(this)).start();
  }

  /**
   * Tries to add token transfers from the next pending block into the publish queue.
   */
  async handlePendingBlock() {
    const blockNumber = await this.getPendingBlockNumber();
    if (blockNumber === null) {
      return;
    }
    const transfers = await this.getBlockTransfers(blockNumber);
    await Promise.each(transfers, transfer => this.db.addTransfer(transfer));
    logger.info(`Processed block ${blockNumber} successfully.`);
    await this.db.setPendingBlockNumber(blockNumber + 1);
  }

  /**
   * Gets the block number for the next pending block which has enough
   * confirmations for publishing. If no pending block is available, the
   * latest block with enough confirmations is returned.
   * @returns {Number}
   */
  async getPendingBlockNumber() {
    const pendingBlockNumber = await this.db.getPendingBlockNumber();
    const nextBlockNumber = await this.web3.eth.getBlockNumberAsync() + 1;
    if (pendingBlockNumber === null) {
      return MIN_CONFIRMATIONS <= nextBlockNumber
        ? nextBlockNumber - MIN_CONFIRMATIONS
        : null;
    }
    return pendingBlockNumber + MIN_CONFIRMATIONS <= nextBlockNumber
      ? pendingBlockNumber
      : null;
  }

  /**
   * Fetches all token transfers for the block at the given height.
   * @param {Number} blockNumber - Height from block from which to retrieve transfers.
   */
  async getBlockTransfers(blockNumber) {
    const transfers = await Promise.reduce(
      this.contracts,
      async (result, contract, idx) =>
        result.concat(await this.getContractTransfers(
          contract,
          this.contractInstances[idx],
          { fromBlock: blockNumber, toBlock: blockNumber },
        )),
      [],
    );
    return transfers.sort((t1, t2) => t1.logIndex - t2.logIndex);
  }

  /**
   * Fetches all token transfers for the given contract instance, subject to the
   * given filtering options.
   * @param {Contract} contract - Contract from which to retrieve token transfers.
   * @param {Contract} contractInstance - Specific instance from the given contract.
   * @param {Object} filterOpts - Options specifying which events to filter for.
   * @returns {Object}
   */
  async getContractTransfers(contract, contractInstance, filterOpts) {
    const filter = contractInstance.Transfer({}, filterOpts);
    const logs = await Promise.promisify(cb => filter.get(cb))();
    return logs.map((log) => {
      const { blockNumber, logIndex, transactionHash, args } = log;
      const { from, to, value: valueObj } = args;
      const value = valueObj.dividedBy(new BigNumber(10).toPower(contract.decimals));
      return {
        blockNumber,
        logIndex,
        transactionHash,
        from,
        to,
        value: value.toString(),
        unit: contract.symbol,
      };
    });
  }
}

module.exports = BlockchainListener;
