// Based on: http://truffleframework.com/tutorials/robust-smart-contracts-with-openzeppelin
pragma solidity ^0.4.18;

import 'zeppelin-solidity/contracts/token/StandardToken.sol';

contract DizzyToken is StandardToken {

  string public name = 'DizzyToken';
  string public symbol = 'DZN';
  uint public decimals = 2;
  uint public initialSupply = 10000000000000;

  function DizzyToken() {
    totalSupply = initialSupply;
    balances[msg.sender] = initialSupply;
  }
}
