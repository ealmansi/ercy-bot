const leftPad = require('left-pad');

const ENCODING_PREFIX_LENGTH = 2;

class DatabaseUtil {
  static keySeparator() {
    return ':';
  }

  static getTransferId(transfer) {
    return [
      transfer.blockNumber,
      transfer.logIndex,
    ].join(DatabaseUtil.keySeparator());
  }

  static encodeTransferId(transferId) {
    const [blockNumber, logIndex] = transferId.split(DatabaseUtil.keySeparator());
    return [
      DatabaseUtil.paddedLength(blockNumber),
      blockNumber,
      DatabaseUtil.paddedLength(logIndex),
      logIndex,
    ].join(DatabaseUtil.keySeparator());
  }

  static decodeTransferId(encodedTransferId) {
    const pieces = encodedTransferId.split(DatabaseUtil.keySeparator());
    return [
      pieces[1],
      pieces[3],
    ].join(DatabaseUtil.keySeparator());
  }

  static paddedLength(number) {
    return leftPad(number.toString().length, ENCODING_PREFIX_LENGTH, '0');
  }

  static flatten(array) {
    return array.reduce((result, element) => result.concat(element), []);
  }
}

module.exports = DatabaseUtil;
