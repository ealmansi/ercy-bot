# dizzy-chipmunk

## Development

### Step 1

Copy file `config/development.json.sample` into `config/development.json` and introduce the following information:

- TOKEN_ADDRESS: address where the target contract is hosted on the blockchain.
- SLACK_TOKEN: Slack access token for the bot user.
- BOT_ID: user id for the bot user.
- CHANNEL_ID: channel id for the channel where the bot will publish all tranfer events.

### Step 2

Run app in development mode: `$ npm run dev`
