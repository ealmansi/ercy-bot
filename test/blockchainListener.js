/* global describe it */

const chai = require('chai');
const sinon = require('sinon');
const BigNumber = require('bignumber.js');
const BlockchainListener = require('../src/BlockchainListener');

describe('BlockchainListener', () => {
  const ERC20Abi = [{'constant':true,'inputs':[],'name':'totalSupply','outputs':[{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':true,'inputs':[{'name':'who','type':'address'}],'name':'balanceOf','outputs':[{'name':'','type':'uint256'}],'payable':false,'stateMutability':'view','type':'function'},{'constant':false,'inputs':[{'name':'to','type':'address'},{'name':'value','type':'uint256'}],'name':'transfer','outputs':[{'name':'','type':'bool'}],'payable':false,'stateMutability':'nonpayable','type':'function'},{'anonymous':false,'inputs':[{'indexed':true,'name':'from','type':'address'},{'indexed':true,'name':'to','type':'address'},{'indexed':false,'name':'value','type':'uint256'}],'name':'Transfer','type':'event'}]; // eslint-disable-line

  const TEST_CONTRACTS = [
    {
      name: 'Name 1',
      symbol: 'SYM1',
      decimals: 6,
      address: '0x1',
    },
    {
      name: 'Name 2',
      symbol: 'SYM2',
      decimals: 9,
      address: '0x2',
    },
    {
      name: 'Name 3',
      symbol: 'SYM3',
      decimals: 18,
      address: '0x3',
    },
  ];

  const buildBlockchainListener = (contractInstances = TEST_CONTRACTS) => {
    const at = sinon.stub();
    contractInstances.forEach((contractInstance, idx) => {
      at.onCall(idx).returns(contractInstance);
    });
    const web3 = {
      eth: {
        contract: sinon.stub().returns({ at }),
      },
    };
    const db = sinon.spy();
    return new BlockchainListener(TEST_CONTRACTS, ERC20Abi, web3, db);
  };

  describe('#constructor()', () => {
    it('should fail if called with no contracts', () => {
      chai.assert.throws(() => {
        new BlockchainListener([]); // eslint-disable-line no-new
      });
    });

    it('should construct contract instances', () => {
      const listener = buildBlockchainListener();
      chai.assert.lengthOf(listener.contractInstances, TEST_CONTRACTS.length);
    });
  });

  describe('#getPendingBlockNumber()', () => {
    // No previously saved pending block. No confirmed blocks available.
    const BLOCK_NUMBER_0 = 5;
    const EXPECTED_BLOCK_NUMBER_RANGE_0 = null;

    // No previously saved pending block. Confirmed block available.
    const BLOCK_NUMBER_1 = 20;
    const PENDING_BLOCK_NUMBER_1 = null;
    const EXPECTED_BLOCK_NUMBER_RANGE_1 = [9, 9];

    // Previously saved pending block without enough confirmations.
    const BLOCK_NUMBER_2 = 25;
    const PENDING_BLOCK_NUMBER_2 = 20;
    const EXPECTED_BLOCK_NUMBER_RANGE_2 = null;

    // Previously saved pending block with enough confirmations.
    const BLOCK_NUMBER_3 = 45;
    const PENDING_BLOCK_NUMBER_3 = 20;
    const EXPECTED_BLOCK_NUMBER_RANGE_3 = [20, 24];

    it('should calculate next pending confirmed block correctly', async () => {
      const listener = buildBlockchainListener();
      listener.web3.eth.getBlockNumberAsync = sinon.stub();
      listener.db.getPendingBlockNumber = sinon.stub();
      listener.web3.eth.getBlockNumberAsync.onCall(0).returns(BLOCK_NUMBER_0);
      listener.web3.eth.getBlockNumberAsync.onCall(1).returns(BLOCK_NUMBER_1);
      listener.db.getPendingBlockNumber.onCall(0).returns(PENDING_BLOCK_NUMBER_1);
      listener.web3.eth.getBlockNumberAsync.onCall(2).returns(BLOCK_NUMBER_2);
      listener.db.getPendingBlockNumber.onCall(1).returns(PENDING_BLOCK_NUMBER_2);
      listener.web3.eth.getBlockNumberAsync.onCall(3).returns(BLOCK_NUMBER_3);
      listener.db.getPendingBlockNumber.onCall(2).returns(PENDING_BLOCK_NUMBER_3);
      chai.assert.deepEqual(
        await listener.getBlockNumberRange(),
        EXPECTED_BLOCK_NUMBER_RANGE_0,
      );
      chai.assert.deepEqual(
        await listener.getBlockNumberRange(),
        EXPECTED_BLOCK_NUMBER_RANGE_1,
      );
      chai.assert.deepEqual(
        await listener.getBlockNumberRange(),
        EXPECTED_BLOCK_NUMBER_RANGE_2,
      );
      chai.assert.deepEqual(
        await listener.getBlockNumberRange(),
        EXPECTED_BLOCK_NUMBER_RANGE_3,
      );
    });
  });

  describe('#getContractTransfers()', () => {
    const TEST_CONTRACT_LOGS = [
      {
        blockNumber: 123456,
        logIndex: 78,
        transactionHash: '0x0',
        args: {
          from: '0x1',
          to: '0x2',
          value: new BigNumber('10'),
        },
      },
    ];

    const EXPECTED_TRANSFERS = [
      {
        blockNumber: 123456,
        logIndex: 78,
        transactionHash: '0x0',
        from: '0x1',
        to: '0x2',
        value: '0.00001',
        unit: 'SYM1',
      },
    ];

    it('should read event logs into transfers correctly', async () => {
      const listener = buildBlockchainListener();
      const contractInstance = {
        Transfer: sinon.stub().returns({
          get: sinon.stub().yields(null, TEST_CONTRACT_LOGS),
        }),
      };
      chai.assert.deepEqual(
        await listener.getContractTransfers(TEST_CONTRACTS[0], contractInstance, {}),
        EXPECTED_TRANSFERS,
      );
    });
  });

  describe('#getBlockTransfers()', () => {
    const BLOCK_NUMBER = 12345;
    const NEXT_BLOCK_NUMBER = BLOCK_NUMBER + 1;

    const TEST_CONTRACT_LOGS = [
      [
        {
          blockNumber: BLOCK_NUMBER,
          logIndex: 2,
          transactionHash: '0x2',
          args: {
            from: '0xabc',
            to: '0xdef',
            value: new BigNumber('123456'),
          },
        },
        {
          blockNumber: NEXT_BLOCK_NUMBER,
          logIndex: 1,
          transactionHash: '0x4',
          args: {
            from: '0xabc',
            to: '0xdef',
            value: new BigNumber('123456'),
          },
        },
      ],
      [
        {
          blockNumber: BLOCK_NUMBER,
          logIndex: 1,
          transactionHash: '0x1',
          args: {
            from: '0xabc',
            to: '0xdef',
            value: new BigNumber('12345678901234'),
          },
        },
        {
          blockNumber: NEXT_BLOCK_NUMBER,
          logIndex: 3,
          transactionHash: '0x6',
          args: {
            from: '0xabc',
            to: '0xdef',
            value: new BigNumber('12345678901234'),
          },
        },
      ],
      [
        {
          blockNumber: BLOCK_NUMBER,
          logIndex: 3,
          transactionHash: '0x3',
          args: {
            from: '0xabc',
            to: '0xdef',
            value: new BigNumber('1'),
          },
        },
        {
          blockNumber: NEXT_BLOCK_NUMBER,
          logIndex: 2,
          transactionHash: '0x5',
          args: {
            from: '0xabc',
            to: '0xdef',
            value: new BigNumber('1'),
          },
        },
      ],
    ];

    const EXPECTED_TRANSFERS = [
      {
        blockNumber: BLOCK_NUMBER,
        logIndex: 1,
        transactionHash: '0x1',
        from: '0xabc',
        to: '0xdef',
        value: '12345.678901234',
        unit: 'SYM2',
      },
      {
        blockNumber: BLOCK_NUMBER,
        logIndex: 2,
        transactionHash: '0x2',
        from: '0xabc',
        to: '0xdef',
        value: '0.123456',
        unit: 'SYM1',
      },
      {
        blockNumber: BLOCK_NUMBER,
        logIndex: 3,
        transactionHash: '0x3',
        from: '0xabc',
        to: '0xdef',
        value: '1e-18',
        unit: 'SYM3',
      },
      {
        blockNumber: NEXT_BLOCK_NUMBER,
        logIndex: 1,
        transactionHash: '0x4',
        from: '0xabc',
        to: '0xdef',
        value: '0.123456',
        unit: 'SYM1',
      },
      {
        blockNumber: NEXT_BLOCK_NUMBER,
        logIndex: 2,
        transactionHash: '0x5',
        from: '0xabc',
        to: '0xdef',
        value: '1e-18',
        unit: 'SYM3',
      },
      {
        blockNumber: NEXT_BLOCK_NUMBER,
        logIndex: 3,
        transactionHash: '0x6',
        from: '0xabc',
        to: '0xdef',
        value: '12345.678901234',
        unit: 'SYM2',
      },
    ];

    it('should collect transfers from all contracts in log index order', async () => {
      const filterOpts = { fromBlock: BLOCK_NUMBER, toBlock: NEXT_BLOCK_NUMBER };
      const contractInstances = TEST_CONTRACTS.map((contract, idx) => ({
        Transfer: sinon.stub().withArgs({}, filterOpts).returns({
          get: sinon.stub().yields(null, TEST_CONTRACT_LOGS[idx]),
        }),
      }));
      const listener = buildBlockchainListener(contractInstances);
      chai.assert.deepEqual(
        await listener.getBlockTransfers([BLOCK_NUMBER, NEXT_BLOCK_NUMBER]),
        EXPECTED_TRANSFERS,
      );
    });
  });
});
