/* global describe it */

const chai = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const Promise = require('bluebird');
const Slack = require('slack-node');
const SlackPublisher = require('../src/SlackPublisher');

describe('SlackPublisher', () => {
  const TEST_SLACK_TOKEN = 'SOME_SLACK_TOKEN';

  const TEST_CHANNEL_ID = 'SOME_CHANNEL_ID';

  const TEST_EXPLORER_BASE_URLS = {
    address: 'http://someexplorer.com/address',
    transaction: 'http://someexplorer.com/tx',
  };

  const buildSlackPublisher = () => {
    const slack = Promise.promisifyAll(new Slack(TEST_SLACK_TOKEN));
    const db = sinon.stub();
    return new SlackPublisher(slack, TEST_CHANNEL_ID, TEST_EXPLORER_BASE_URLS, db);
  };

  describe('#handleTransfer()', () => {
    const TEST_TRANSFER = {
      blockNumber: 123456,
      logIndex: 78,
      transactionHash: '0x0',
      from: '0x1',
      to: '0x2',
      value: '10',
      unit: 'SYM1',
    };

    const TRANSFER_MESSAGE = '<http://someexplorer.com/address/0x1|0x1...> sent 10 SYM1 to <http://someexplorer.com/address/0x2|0x2...>! (tx: <http://someexplorer.com/tx/0x0|0x0...>).';

    it('should build message from transfer successfully', (done) => {
      const slackApi = nock('https://slack.com/api')
        .get('/chat.postMessage')
        .query((query) => {
          chai.assert.deepEqual(query, {
            as_user: 'true',
            text: TRANSFER_MESSAGE,
            channel: TEST_CHANNEL_ID,
            token: TEST_SLACK_TOKEN,
          });
          return true;
        })
        .reply(200, { ok: true });
      const publisher = buildSlackPublisher();
      publisher.db.nextTransfer = sinon.stub().returns(TEST_TRANSFER);
      publisher.db.removeTransfer = sinon.stub();
      publisher.handleTransfer().then(() => {
        chai.assert.isTrue(publisher.db.removeTransfer.calledWith(TEST_TRANSFER));
      }).then(() => {
        setTimeout(() => { slackApi.done(); done(); }, 1000);
      });
    });
  });

  describe('#sendMessage()', () => {
    const TEST_MESSAGE = 'Some test message!';

    it('should build message from transfer successfully', (done) => {
      const publisher = buildSlackPublisher();
      const slackApi = nock('https://slack.com/api')
        .get('/chat.postMessage')
        .query((query) => {
          chai.assert.deepEqual(query, {
            as_user: 'true',
            text: TEST_MESSAGE,
            channel: TEST_CHANNEL_ID,
            token: TEST_SLACK_TOKEN,
          });
          return true;
        })
        .reply(200, { ok: true });
      publisher.sendMessage(TEST_MESSAGE);
      setTimeout(() => { slackApi.done(); done(); }, 1000);
    });
  });

  describe('#buildMessage()', () => {
    const TEST_TRANSFER = {
      blockNumber: 123456,
      logIndex: 78,
      transactionHash: '0x0',
      from: '0x1',
      to: '0x2',
      value: '10',
      unit: 'SYM1',
    };

    it('should build message from transfer successfully', () => {
      const publisher = buildSlackPublisher();
      chai.assert.equal(
        publisher.buildMessage(TEST_TRANSFER),
        '<http://someexplorer.com/address/0x1|0x1...> sent 10 SYM1 to <http://someexplorer.com/address/0x2|0x2...>! (tx: <http://someexplorer.com/tx/0x0|0x0...>).',
      );
    });
  });

  describe('#makeAddressLink()', () => {
    const TEST_ADDRESS = '0x5f06fc2a5afe54e926a21fdfef056f93a7f1e6cb';

    it('should make a link for an address successfully', () => {
      const publisher = buildSlackPublisher();
      chai.assert.equal(
        publisher.makeAddressLink(TEST_ADDRESS),
        '<http://someexplorer.com/address/0x5f06fc2a5afe54e926a21fdfef056f93a7f1e6cb|0x5f06fc...>',
      );
    });
  });

  describe('#makeTransactionHashLink()', () => {
    const TEST_TRANSACTION_HASH =
        '0xee778b9574cfbbc7027d4ce8c998024c257c95878d0a553d9423b14bc6d98360';

    it('should make a link for a tx hash successfully', () => {
      const publisher = buildSlackPublisher();
      chai.assert.equal(
        publisher.makeTransactionHashLink(TEST_TRANSACTION_HASH),
        '<http://someexplorer.com/tx/0xee778b9574cfbbc7027d4ce8c998024c257c95878d0a553d9423b14bc6d98360|0xee778b...>',
      );
    });
  });
});
