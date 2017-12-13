
npx concurrently --kill-others --names 'REDIS,SLACK,BOT' \
  'node src/start-redis.js' \
  'node src/mock-slack.js' \
  'sleep 1 && node src/index.js'
