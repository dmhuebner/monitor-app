/*
* general helper functions
*
**/

const crypto = require('crypto'),
      config = require('../config'),
      querystring = require('querystring'),
      https = require('https');

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

// Create a string of random alphanumeric characters of a given length
helpers.createRandomString = (stringLength) => {
  stringLength = typeof(stringLength) === 'number' && stringLength > 0 ? stringLength : false;

  if (stringLength) {
    // Define all the possible characters that could go into a string
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

    let randomString = '';

    for (let i = 1; i <= stringLength; i++) {
      // Get a random character from possibleCharacteers
      const randomChar = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
      // Append random character
      randomString += randomChar;
    }

    return randomString;
  }
};

// Send SMS message via Twilio
helpers.sendTwilioSms = (phone, message, callback) => {
  // Validate the parameters
  phone = typeof(phone) === 'string' && phone.trim().length === 10 ? phone.trim() : false;
  message = typeof(message) === 'string' && message.trim().length > 0 && message.trim().length <= 1600 ? message.trim() : false;

  if (phone && message) {
    // Configure the request payload to send to Twilio
    const payload = {
      From: config.twilio.fromPhone,
      To: `+1${phone}`,
      Body: message
    };

    // Stringify the payload
    const stringPayload = querystring.stringify(payload);

    // configure the request details
    const requestDetails = {
      protocol: 'https:',
      port: 443,
      hostname: 'api.twilio.com',
      method: 'POST',
      path: `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
      auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(stringPayload)
      }
    };

    // Instantiate the request object
    const req = https.request(requestDetails, (res) => {
      // Grab the status of the sent request
      const status = res.statusCode;
      // Callback successfully if request was successful
      if (status === 200 || status === 201) {
        callback(false);
      } else {
        callback(`Status code returned was ${status}`);
      }
    });

    // Bind to the error event so it doesn't get thrown and kills the thread
    req.on('error', (error) => {
      callback(error);
    });

    // Add payload to the request
    req.write(stringPayload);

    // End the request (sends off request)
    req.end();

  } else {
    callback('Parameters were missing or invalid');
  }
};

module.exports = helpers;