# ErcyBot: real-time feed of Ethereum ERC20 token transfers in your Slack workspace.

[![Build Status](https://travis-ci.org/ealmansi/ercy-bot.svg?branch=master)](https://travis-ci.org/ealmansi/ercy-bot)

![ErcyBot Preview](https://github.com/ealmansi/ercy-bot/blob/master/imgs/ErcyBotPreview.png "ErcyBot Preview")

## Dependencies

- [Node.js](https://nodejs.org/en/): v8.9.1
- [npm](https://www.npmjs.com/): v5.5.1
- [Redis](https://redis.io/): v4.0.2

\[Optional\] To bootstrap your development process, you may also want to deploy test contracts locally. For this, you will also need the following optional dependencies:

- [EthereumJS TestRPC](https://www.npmjs.com/package/ethereumjs-testrpc): v6.0.1
- [Truffle](http://truffleframework.com/): v4.0.1

## Build and Test

First, clone the project repository and enter the root directory:

```
$ git clone https://github.com/ealmansi/ercy-bot.git
$ cd ercy-bot
```

Next, build the project dependencies:

`$ npm install`

To make sure everything is set up correctly, it would be a good idea to run all tests at this point and verify that they finish successfully: 

`$ npm test`

## Development

### Mocking Token Transfers

Before running Ercy, you can optionally deploy a test token contract locally and generate a stream of mock token transfers for Ercy to display:

```
$ cd truffle
$ npm install
$ npm run deploy
```

This will launch a testrpc instance, deploy a token contract, and generate random token transfers periodically. The address for the deployed contract will be displayed after successful deployment.

### Running ErcyBot in Development Mode.

Copy file `config/local-development.json.sample` into `config/local-development.json` and introduce the following information:

- DEPLOYED_TOKEN_ADDRESS: Address of the deployed test token contract.
- WEB3_PROVIDER_HOST: url of RPC-enabled Ethereum node supporting filters. When running locally with testrpc use: http://localhost:8545/.

Next, run ErcyBot in development mode:

`$ npm run dev`

For running in development mode for the Ropsten test network, update the target contracts and web3 provider host as necessary in `config/ropsten.json`. Then, run the following command:

`$ NETWORK=ropsten npm run dev`

## Production

Copy file `config/local-production.json.sample` into `config/local-production.json` and introduce the following information:

- SLACK_TOKEN: Slack access token for the bot user.
- CHANNEL_ID: channel id for the channel where the bot will publish all tranfer events.

Run app in production mode: `$ npm start`

Run app in production mode for Ropsten network: `$ NETWORK=ropsten npm start`

## Documentation

Build and browse documentation: `$ npm run docs`
