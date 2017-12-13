# ErcyBot: real-time feed of Ethereum ERC20 token transfers in your Slack workspace.

[![Build Status](https://travis-ci.org/ealmansi/ercy-bot.svg?branch=master)](https://travis-ci.org/ealmansi/ercy-bot)

![ErcyBot Preview](https://github.com/ealmansi/ercy-bot/blob/master/imgs/ErcyBotPreview.png "ErcyBot Preview")

## Dependencies

- [Node.js](https://nodejs.org/en/): v8.9.1.
- [npm](https://www.npmjs.com/): v5.5.1.
- [Redis](https://redis.io/): v3.2.11.

You can check everything is installed correctly by running the following commands:

```
$ node --version
v8.9.1

$ npm --version
5.5.1

$ redis-server --version
Redis server v=3.2.11 (...)
```

## Build and Test

First, make sure that you have all the dependencies listed in the previous section. Then, clone the project repository and enter the root directory:

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

Before running Ercy, you can optionally deploy a test token contract locally and generate a stream of mock token transfers for Ercy to display with the following command:

```
$ npm run deploy-token
```

This will launch a [TestRPC](https://www.npmjs.com/package/ethereumjs-testrpc) instance, compile & deploy a test token contract using [Truffle](http://truffleframework.com/), and run a script to generate random token transfers periodically.

### Running ErcyBot in Development Mode.

The simplest way to get started is by deploying a test contract as described in the section above, and running ErcyBot in development mode:

`$ npm run dev`

If instead you would like to use a custom Ethereum node as a web3 provider and listen to events from a contract of your own, you will need to edit the file `config/development.json` and update the following properties:

- eth.contracts: Address and description of the target contracts.
- eth.web3.host: url of RPC-enabled Ethereum node supporting filters.

For running in development mode for the Ropsten test network, update the target contracts and web3 provider host as necessary in `config/ropsten.json`. Then, run the following command:

`$ NETWORK=ropsten npm run dev`

## Production

When running ErcyBot in production mode, Ercy will listen to events on mainnet by default. You will need to configure which contracts you'd like Ercy to listen for, and your Slack authorization details.

For this, you will need to edit the file `config/production.json` and update the following properties:

- eth.contracts: Address and description of the target contracts.
- eth.web3.host: url of RPC-enabled Ethereum node supporting filters.

You will also need to copy file `config/local-production.json.sample` into `config/local-production.json` and replace the following placeholders:

- SLACK_TOKEN: Slack access token for the bot user.
- CHANNEL_ID: channel id for the channel where the bot will publish all tranfer events.

For running ErcyBot in production, you will need to have a running `redis-server` instance in the default Redis port. You can verify if this is set up correctly by checking for the following output:

```
$ redis-cli
127.0.0.1:6379>
```

Once everything is set up, you can run ErcyBot with the following command:

`$ npm start`

For running in production mode for the Ropsten test network, update the target contracts and web3 provider host as necessary in `config/ropsten.json`. Then, run the following command:

`$ NETWORK=ropsten npm run dev`

## Documentation

Build and browse documentation: `$ npm run docs`
