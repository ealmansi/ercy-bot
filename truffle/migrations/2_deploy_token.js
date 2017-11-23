const DizzyToken = artifacts.require("./DizzyToken.sol");

module.exports = function(deployer) {
  deployer.deploy(DizzyToken);
};
