const logger = require('../logger');
const Promise = require('bluebird');
const PollingWithRetry = require('./PollingWithRetry');
const BigNumber = require('bignumber.js');

const MIN_CONFIRMATIONS = 12;
const MAX_BLOCK_BATCH_SIZE = 5;

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
    new PollingWithRetry(this.handlePendingBlockBatch.bind(this)).start();
  }

  /**
   * Tries to add token transfers from the next batch of pending (unprocessed) blocks
   * into the publishing queue.
   */
  async handlePendingBlockBatch() {
    const blockNumberRange = await this.getBlockNumberRange();
    if (blockNumberRange === null) {
      return;
    }
    const transfers = await this.getBlockTransfers(blockNumberRange);
    await Promise.each(transfers, transfer => this.db.addTransfer(transfer));
    logger.info(`Processed up to block ${blockNumberRange[1]} successfully.`);
    await this.db.setPendingBlockNumber(blockNumberRange[1] + 1);
  }

  /**
   * Produces an array with two elements defining a range of block numbers
   * for fetching next.
   *
   * The range begins with the next pending block, and extends
   * up to the latest block which has at least MIN_CONFIRMATIONS confirmations,
   * without exceeding a range size of MAX_BLOCK_BATCH_SIZE.
   *
   * If no block has been marked as pending, a range containing only the
   * latest block with MIN_CONFIRMATIONS confirmations is returned.
   *
   * If no blocks in this range have at least MIN_CONFIRMATIONS confirmations,
   * null is returned instead.
   * @returns {Array}
   */
  async getBlockNumberRange() {
    const nextBlockNumber = await this.web3.eth.getBlockNumberAsync() + 1;
    if (nextBlockNumber < MIN_CONFIRMATIONS) {
      return null;
    }
    const confirmedBlockNumber = nextBlockNumber - MIN_CONFIRMATIONS;
    const pendingBlockNumber = await this.db.getPendingBlockNumber();
    if (pendingBlockNumber === null) {
      return [confirmedBlockNumber, confirmedBlockNumber];
    }
    if (confirmedBlockNumber < pendingBlockNumber) {
      return null;
    }
    return [
      pendingBlockNumber,
      Math.min(confirmedBlockNumber, pendingBlockNumber + (MAX_BLOCK_BATCH_SIZE - 1)),
    ];
  }

  /**
   * Fetches all token transfers for the blocks in the given range.
   * @param {Array} blockNumberRange - Range of block numbers to be fetched.
   */
  async getBlockTransfers(blockNumberRange) {
    const transfers = await Promise.reduce(
      this.contracts,
      async (result, contract, idx) =>
        result.concat(await this.getContractTransfers(
          contract,
          this.contractInstances[idx],
          { fromBlock: blockNumberRange[0], toBlock: blockNumberRange[1] },
        )),
      [],
    );
    return transfers.sort(BlockchainListener.compareTransactions);
  }

  /**
   * Compares transactions t1 and t2 by the order of their appearence in the blockchain.
   * @param {Object} t1
   * @param {Object} t2
   */
  static compareTransactions(t1, t2) {
    return t1.blockNumber !== t2.blockNumber
      ? t1.blockNumber - t2.blockNumber
      : t1.logIndex - t2.logIndex;
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
