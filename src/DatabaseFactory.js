const Promise = require('bluebird');
const redis = Promise.promisifyAll(require('redis'));
const leftPad = require('left-pad');

const KEY_SEPARATOR = ':';
const ENCODING_PREFIX_LENGTH = 2;

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
      const fields = this.flatten(Object.entries(transfer));
      const transferId = this.makeTransferId(transfer);
      await this.redisClient.multi()
        .hmset(transferKey, ...fields)
        .expire(transferKey, this.cacheTtl)
        .zadd(this.transfersKey, 0, this.encodeTransferId(transferId))
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
    const transferId = this.decodeTransferId(range[0]);
    const transferKey = this.makeTransferKeyFromId(transferId);
    return this.redisClient.hgetallAsync(transferKey);
  }

  async removeTransfer(transfer) {
    const transferId = this.makeTransferId(transfer);
    await this.redisClient.zremAsync(this.transfersKey, this.encodeTransferId(transferId));
  }

  makeTransferId(transfer) {
    return [transfer.blockNumber, transfer.logIndex].join(KEY_SEPARATOR);
  }

  makeTransferKeyFromId(transferId) {
    return this.addNamespace(['tx', transferId].join(KEY_SEPARATOR));
  }

  makeTransferKey(transfer) {
    return this.makeTransferKeyFromId(this.makeTransferId(transfer));
  }

  encodeTransferId(transferId) {
    const [blockNumber, logIndex] = transferId.split(KEY_SEPARATOR);
    return [
      this.encodeLength(blockNumber),
      blockNumber,
      this.encodeLength(logIndex),
      logIndex,
    ].join(KEY_SEPARATOR);
  }

  encodeLength(number) {
    return leftPad(number.toString().length, ENCODING_PREFIX_LENGTH, '0');
  }

  decodeTransferId(encodedTransferId) {
    const pieces = encodedTransferId.split(KEY_SEPARATOR);
    return [pieces[1], pieces[3]].join(KEY_SEPARATOR);
  }

  addNamespace(baseKey) {
    return [this.namespace, baseKey].join(KEY_SEPARATOR);
  }

  flatten(array) {
    return array.reduce((result, element) => result.concat(element), []);
  }
}

class DatabaseFactory {
  static createClient(namespace, cacheTtl) {
    return new Promise((resolve, reject) => {
      const redisClient = redis.createClient();
      redisClient.on('ready', () => {
        resolve(new DatabaseClient(namespace, cacheTtl, redisClient));
      });
      redisClient.on('error', reject);
    });
  }
}

module.exports = DatabaseFactory;
