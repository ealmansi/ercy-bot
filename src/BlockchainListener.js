const logger = require('./logger');
const Promise = require('bluebird');
const PollingWithRetry = require('./PollingWithRetry');

const MIN_CONFIRMATIONS = 12;

class BlockchainListener {
  constructor(contracts, abi, web3, db) {
    this.contracts = contracts;
    this.abi = abi;
    this.web3 = web3;
    this.db = db;
    this.instances = contracts.map(contract =>
      web3.eth.contract(abi).at(contract.address));
  }

  start() {
    logger.info('Starting blockchain listener.');
    new PollingWithRetry(this.handlePendingBlock.bind(this)).start();
  }

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

  async getBlockTransfers(blockNumber) {
    const transfers = await Promise.reduce(
      this.contracts,
      async (result, contract, idx) =>
        result.concat(await this.getContractTransfers(
          contract,
          this.instances[idx],
          { fromBlock: blockNumber, toBlock: blockNumber },
        )),
      [],
    );
    return transfers.sort((t1, t2) => t1.logIndex - t2.logIndex);
  }

  async getContractTransfers(contract, instance, filterOpts) {
    const filter = instance.Transfer({}, filterOpts);
    const logs = await Promise.promisify(cb => filter.get(cb))();
    return logs.map((log) => {
      const { blockNumber, logIndex, transactionHash, args } = log;
      const { from, to, value: valueObj } = args;
      return {
        blockNumber,
        logIndex,
        transactionHash,
        from,
        to,
        value: valueObj.toString(),
        unit: contract.symbol,
      };
    });
  }
}

module.exports = BlockchainListener;
