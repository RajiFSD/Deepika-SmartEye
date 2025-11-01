// const ResponseHandler = require('./responseHandler');
// const constants = require('./constants');

// // Export everything
// module.exports = {
//   ResponseHandler,
//   ...constants
// };

// src/utils/index.js
const ResponseHandler = require('./responseHandler');
const logger = require('./logger');
const requestLogger = require('./requestLogger');
const helpers = require('./helpers');
const constants = require('./constant'); // now resolvable

module.exports = {
  ResponseHandler,
  logger,
  requestLogger,
  helpers,
  constants,
};
