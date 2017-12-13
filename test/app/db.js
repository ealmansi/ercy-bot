/* global describe it before after */
/* eslint no-unused-vars: 0 */
const chai = require('chai');
const logger = require('../../src/logger');
const DatabaseClient = require('../../src/app/db/DatabaseClient');
const DatabaseUtil = require('../../src/app/db/DatabaseUtil');
const Promise = require('bluebird');
const RedisServer = require('redis-server');

describe('DatabaseUtil', () => {
  describe('#getTransferId()', () => {
    it('should produce a correct transfer id', () => {
      chai.assert.equal(
        DatabaseUtil.getTransferId({ blockNumber: 123456789, logIndex: 234 }),
        '123456789:234',
      );
    });
  });

  describe('#encodeTransferId(), #decodeTransferId()', () => {
    it('should encode a transfer id successfully', () => {
      chai.assert.equal(
        DatabaseUtil.encodeTransferId('123456789:234'),
        '09:123456789:03:234',
      );
    });

    it('should decode a transfer id successfully', () => {
      chai.assert.equal(
        DatabaseUtil.decodeTransferId('09:123456789:03:234'),
        '123456789:234',
      );
    });

    it('should encode transfer ids preserving order', () => {
      const transfers = [
        { blockNumber: 123456, logIndex: 789 },
        { blockNumber: 1234567, logIndex: 789 },
        { blockNumber: 999, logIndex: 999 },
        { blockNumber: 1234567, logIndex: 987 },
        { blockNumber: 1000, logIndex: 1000 },
        { blockNumber: 123456, logIndex: 987 },
      ];
      const indexedTransfers = transfers
        .map((transfer, idx) => [idx, transfer]);
      const sortedTransfers = indexedTransfers
        .sort(([idxA, a], [idxB, b]) => (
          a.blockNumber !== b.blockNumber
            ? a.blockNumber - b.blockNumber
            : a.logIndex - b.logIndex
        ));
      const encodedTransferIds = transfers.map((transfer, idx) => [
        idx,
        DatabaseUtil.encodeTransferId(DatabaseUtil.getTransferId(transfer)),
      ]);
      const sortedEncodedTransferIds = encodedTransferIds
        .sort(([idxA, a], [idxB, b]) => a.localeCompare(b));
      chai.assert.deepEqual(
        sortedTransfers.map(([idx, transfer]) => idx),
        sortedEncodedTransferIds.map(([idx, encodedTransferId]) => idx),
      );
    });
  });
});

describe('DatabaseClient', () => {
  const TEST_NAMESPACE = 'ercybottest';

  const TEST_TTL = 10;

  const TEST_BLOCK_NUMBER = 12345;

  const TEST_TRANSFERS = [
    {
      blockNumber: TEST_BLOCK_NUMBER,
      logIndex: 1,
      transactionHash: '0x1',
      from: '0xabc',
      to: '0xdef',
      value: '10',
      unit: 'SYM2',
    },
    {
      blockNumber: TEST_BLOCK_NUMBER,
      logIndex: 2,
      transactionHash: '0x2',
      from: '0xabc',
      to: '0xdef',
      value: '10',
      unit: 'SYM1',
    },
    {
      blockNumber: TEST_BLOCK_NUMBER,
      logIndex: 3,
      transactionHash: '0x3',
      from: '0xabc',
      to: '0xdef',
      value: '10',
      unit: 'SYM3',
    },
  ];

  let server;
  let db;

  async function launchRedisServer() {
    return new Promise((resolve, reject) => {
      const redisServer = new RedisServer();
      redisServer.open((error) => {
        if (error) {
          reject(error);
        }
        resolve(Promise.promisifyAll(redisServer));
      });
    });
  }

  before(async () => {
    server = null;
    db = await DatabaseClient.create(TEST_NAMESPACE, TEST_TTL).catch(err => null);
    if (db === null) {
      server = await launchRedisServer();
      db = await DatabaseClient.create(TEST_NAMESPACE, TEST_TTL);
    }
    const keys = await db.redisClient.keysAsync(`${TEST_NAMESPACE}:*`);
    if (keys.length > 0) {
      await db.redisClient.delAsync(...keys);
    }
  });

  after(async () => {
    if (db !== null) {
      await db.redisClient.quitAsync();
    }
    if (server !== null) {
      await server.closeAsync();
    }
  });

  describe('#getPendingBlockNumber(), #setPendingBlockNumber()', () => {
    it('should start out with an empty block number', async () => {
      chai.assert.isNull(await db.getPendingBlockNumber());
    });

    it('should set and get block number correctly', async () => {
      await db.setPendingBlockNumber(TEST_BLOCK_NUMBER);
      chai.assert.equal(await db.getPendingBlockNumber(), TEST_BLOCK_NUMBER);
    });
  });

  describe('#addTransfer(), #nextTransfer(), #removeTransfer()', () => {
    it('should start out with an empty transfer queue', async () => {
      chai.assert.isNull(await db.nextTransfer());
    });

    it('should add, retrieve and remove transfers correctly', async () => {
      await Promise.each(
        TEST_TRANSFERS,
        async (transfer) => {
          await db.addTransfer(transfer);
          chai.assert.deepEqual(await db.nextTransfer(), TEST_TRANSFERS[0]);
        },
      );
      await Promise.each(
        TEST_TRANSFERS,
        async (transfer) => {
          chai.assert.deepEqual(await db.nextTransfer(), transfer);
          await db.removeTransfer(transfer);
        },
      );
      chai.assert.isNull(await db.nextTransfer());
    });
  });
});
