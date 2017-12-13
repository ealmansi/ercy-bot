
npx concurrently --kill-others --names 'TESTRPC,TRUFFLE' \
  'npx testrpc -d' \
  'sleep 1 &&
    npx truffle compile &&
    npx truffle migrate &&
    npx truffle exec src/token-transfers.js'
