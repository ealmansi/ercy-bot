// require('babel-register');

// module.exports = {
//   networks: {
//     development: {
//       host: 'localhost',
//       port: 8545,
//       gas: 4700036,
//       network_id: '*'
//     },
//     ropsten: {
//       host: 'ropsten.smartcontracts.xyz',
//       port: 8565,
//       gas: 4700036,
//       network_id: "3",
//     }
//   }
// };

var HDWalletProvider = require("truffle-hdwallet-provider");

var infura_apikey = "3zxxgIUG8QdF9cKWbLQP";
var mnemonic = "learn digital grit wide toddler mobile select run drill light bicycle dove";

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      gas: 4700036,
      network_id: "*" // Match any network id
    },
    ropsten: {
      provider: new HDWalletProvider(mnemonic, "https://ropsten.infura.io/"+infura_apikey),
      gas: 4700036,
      network_id: 3
    }
  }
};
