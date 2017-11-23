require('babel-register');

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      gas: 4700036,
      network_id: '*'
    },
    ropsten: {
      host: 'ropsten.smartcontracts.xyz',
      port: 8555,
      gas: 4700036,
      network_id: "3",
    }
  }
};
