require('babel-register');
const config = require('./config');

module.exports = {
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      gas: 4700036,
      network_id: '*'
    },
    ropsten: {
      host: config.ropsten.host,
      port: config.ropsten.port,
      gas: 4700036,
      network_id: "3",
    }
  }
};
