const config = require('config');
const path = require("path");
const winston = require('winston');

const createLogger = () => {
  const transports = [];
  if (config.get('logger.console')) {
    transports.push(new winston.transports.Console({
      timestamp: true,
      level: config.get('logger.level'),
      json: false,
    }));
  }
  if (config.has('logger.file')) {
    const filepath = path.resolve(require.main.filename, '..', config.get('logger.file'));
    transports.push(new winston.transports.File({
      filename: filepath,
      level: config.get('logger.level'),
      json: false
    }));
  }
  return new winston.Logger({ transports });
};

module.exports = createLogger();
