const DatabaseUtil = require('./DatabaseUtil');

class DatabaseClient {
  constructor(namespace, cacheTtl, redisClient) {
    this.namespace = namespace;
    this.redisClient = redisClient;
    this.blockNumberKey = this.addNamespace('block');
    this.transfersKey = this.addNamespace('transfers');
    this.cacheTtl = cacheTtl;
  }

  async getPendingBlockNumber() {
    const blockNumber = await this.redisClient.getAsync(this.blockNumberKey);
    return blockNumber !== null ? Number(blockNumber) : null;
  }

  async setPendingBlockNumber(blockNumber) {
    await this.redisClient.setexAsync(this.blockNumberKey, this.cacheTtl, blockNumber);
  }

  async addTransfer(transfer) {
    const transferKey = this.makeTransferKey(transfer);
    const exists = await this.redisClient.existsAsync(transferKey) === 1;
    if (!exists) {
      const fields = DatabaseUtil.flatten(Object.entries(transfer));
      const transferId = DatabaseUtil.getTransferId(transfer);
      await this.redisClient.multi()
        .hmset(transferKey, ...fields)
        .expire(transferKey, this.cacheTtl)
        .zadd(this.transfersKey, 0, DatabaseUtil.encodeTransferId(transferId))
        .expire(this.transfersKey, this.cacheTtl)
        .execAsync();
    }
  }

  async nextTransfer() {
    const range = await this.redisClient.zrangebyscoreAsync(this.transfersKey, ...[
      0, 0, 'LIMIT', 0, 1,
    ]);
    if (range.length === 0) {
      return null;
    }
    const transferId = DatabaseUtil.decodeTransferId(range[0]);
    const transferKey = this.makeTransferKeyFromId(transferId);
    const { blockNumber, logIndex, transactionHash, from, to, value, unit } =
      await this.redisClient.hgetallAsync(transferKey);
    return {
      blockNumber: Number(blockNumber),
      logIndex: Number(logIndex),
      transactionHash,
      from,
      to,
      value,
      unit,
    };
  }

  async removeTransfer(transfer) {
    const transferId = DatabaseUtil.getTransferId(transfer);
    await this.redisClient.zremAsync(
      this.transfersKey,
      DatabaseUtil.encodeTransferId(transferId),
    );
  }

  makeTransferKeyFromId(transferId) {
    const baseKey = [
      'tx',
      transferId,
    ].join(DatabaseUtil.keySeparator());
    return this.addNamespace(baseKey);
  }

  makeTransferKey(transfer) {
    return this.makeTransferKeyFromId(DatabaseUtil.getTransferId(transfer));
  }

  addNamespace(baseKey) {
    return [
      this.namespace,
      baseKey,
    ].join(DatabaseUtil.keySeparator());
  }
}

module.exports = DatabaseClient;
