const leftPad = require('left-pad');

const ENCODING_PREFIX_LENGTH = 2;

/**
 * Utility class for encoding/deoding tranfer ids.
 */
class DatabaseUtil {
  /**
   * Standard key separator character.
   */
  static keySeparator() {
    return ':';
  }

  /**
   * Builds a transferId for the given token transfer.
   * @param {Object} transfer
   * @returns {string}
   */
  static getTransferId(transfer) {
    return [
      transfer.blockNumber,
      transfer.logIndex,
    ].join(DatabaseUtil.keySeparator());
  }

  /**
   * Encodes the given transfer id such that the lexicographical order of the
   * encoded ids matches the event order (blockNumber, logIndex) of the tranfers.
   * @param {string} transferId - Transfer id to encode.
   * @returns {string}
   */
  static encodeTransferId(transferId) {
    const [blockNumber, logIndex] = transferId.split(DatabaseUtil.keySeparator());
    return [
      DatabaseUtil.paddedLength(blockNumber),
      blockNumber,
      DatabaseUtil.paddedLength(logIndex),
      logIndex,
    ].join(DatabaseUtil.keySeparator());
  }

  /**
   * Decodes an encoded transfer id back to the original id.
   * @param {string} encodedTransferId - Encoded transfer id to decode.
   * @returns {string}
   */
  static decodeTransferId(encodedTransferId) {
    const pieces = encodedTransferId.split(DatabaseUtil.keySeparator());
    return [
      pieces[1],
      pieces[3],
    ].join(DatabaseUtil.keySeparator());
  }

  /**
   * Returns a 2-digit, 0-padded string representation of the number's digit count.
   * @param {Number} number
   * @returns {string}
   */
  static paddedLength(number) {
    return leftPad(number.toString().length, ENCODING_PREFIX_LENGTH, '0');
  }

  static flatten(array) {
    return array.reduce((result, element) => result.concat(element), []);
  }
}

module.exports = DatabaseUtil;
