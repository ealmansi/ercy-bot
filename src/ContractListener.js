const logger = require('./logger');

class ContractListener {
  
  constructor(contract, abi, web3, db) {
    this.contract = contract;
    this.abi = abi;
    this.web3 = web3;
    this.db = db;
  }
  
  start() {
    logger.info(`Listening for events from contract: ${this.contract.name}.`);
    const instance = this.web3.eth.contract(this.abi).at(this.contract.address);
    const filter = { fromBlock: 'latest' };
    instance.Transfer({}, filter, this.eventHandler.bind(this));
  }

  async eventHandler(error, event) {
    try {
      if (error) {
        logger.error(`Event handler received error: ${JSON.stringify(error)}`);
        return;
      }
      logger.info(`Received event from contract: ${this.contract.name}.`);
      const { blockNumber, logIndex } = event;
      const eventId = `${blockNumber}:${logIndex}`;
      await this.db.pushEvent(eventId);
    }
    catch (error) {
      logger.error(`Unexpected error while handling event: ${JSON.stringify(error)}.`);
    }
  }
};

module.exports = ContractListener;
