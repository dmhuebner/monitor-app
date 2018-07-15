/*
* general helper functions
*
**/

const crypto = require('crypto'),
      config = require('../config');

// Container for helpers
const helpers = {};

// Create a SHA256 hash
helpers.hash = (str) => {
  if (typeof(str) === 'string' && str.length > 0) {
    return crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex');
  } else {
    return false;
  }
};

// Parse a JSON string to an object in all cases, without throwing an error
helpers.parseJsonToObject = (string) => {
  try {
    const obj = JSON.parse(string);
    return obj;
  } catch(error) {
    return {};
  }
};

module.exports = helpers;