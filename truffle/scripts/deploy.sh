
./node_modules/.bin/concurrently --kill-others --names 'TESTRPC,TRUFFLE' \
  'testrpc' \
  'sleep 1 && truffle compile && truffle migrate && truffle exec mock-transfers.js'
