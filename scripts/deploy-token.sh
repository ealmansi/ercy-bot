
npx concurrently --kill-others --names 'GANACHE,TRUFFLE' \
  'npx ganache-cli -d' \
  'sleep 1 &&
    npx truffle compile &&
    npx truffle migrate &&
    npx truffle exec src/token-transfers.js'
