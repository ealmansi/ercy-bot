
./node_modules/.bin/concurrently --kill-others --names 'REDIS,SLACK,BOT' \
  'node start-redis.js' \
  'node mock-slack.js' \
  'sleep 1 && node index.js'
