# ErcyBot: real-time feed of Ethereum token transfers in your Slack workspace.

[![Build Status](https://travis-ci.org/ealmansi/ercy-bot.svg?branch=master)](https://travis-ci.org/ealmansi/ercy-bot)

## Development

Run app in development mode: `$ npm run dev`

Run app in development mode for Ropsten network: `$ NETWORK=ropsten npm run dev`

## Production

Copy file `config/local-production.json.sample` into `config/local-production.json` and introduce the following information:

- SLACK_TOKEN: Slack access token for the bot user.
- CHANNEL_ID: channel id for the channel where the bot will publish all tranfer events.

Run app in production mode: `$ npm start`

Run app in production mode for Ropsten network: `$ NETWORK=ropsten npm start`

## Test

Run tests: `$ npm test`
