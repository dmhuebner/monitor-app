/*
* general helper functions
*
**/

const crypto = require('crypto'),
      config = require('../config'),
      querystring = require('querystring'),
      https = require('https'),
      path = require('path'),
      fs = require('fs'),
      util = require('util'),
      debug = util.debuglog('helpers');

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

// Get the string content of a template
helpers.getTemplate = (templateName, data, callback) => {
  templateName = typeof(templateName) === 'string' && templateName.length > 0 ? templateName : false;
  data = data && typeof (data) === 'object' ? data : {};

  if (templateName) {
    // Read in the template file
    const templatesDir = path.join(__dirname, '/../templates/');

    fs.readFile(`${templatesDir}${templateName}.html`, 'utf8', (error, string) => {
      if (!error && string && string.length > 0) {

        // Interpolate the html string before calling back
        const interpolatedHtmlString = helpers.interpolate(string, data);
        callback(false, interpolatedHtmlString);
      } else {
        callback('No template was found');
      }
    });
  } else {
    callback('A valid template name was not specified');
  }
};

// Add the universal header and footer to a string and pass the provided data object to the header and footer for interpolation
helpers.addUniversalTemplates = (string, data, callback) => {
  string = typeof(string) === 'string' && string.length > 0 ? string : '';
  data = data && typeof (data) === 'object' ? data : {};

  // Get the header
  helpers.getTemplate('_header', data, (error, headerString) => {
    if (!error && headerString) {
      // Get the footer
      helpers.getTemplate('_footer', data, (error, footerString) => {
        if (!error && footerString) {

          // Add header and footer to template string
          const fullHtmlString = headerString + string + footerString;
          callback(error, fullHtmlString);
        } else {
          callback('Could not find the footer template');
        }
      });
    } else {
      callback('Could not find the header template');
    }
  })
};

// Interpolate the template: {var}
// Take a given string and a data object and find/replace all the keys within it
helpers.interpolate = (string, data) => {
  string = typeof(string) === 'string' && string.length > 0 ? string : '';
  data = data && typeof (data) === 'object' ? data : {};

  // Add the template globals to the data object, prepending their key name with 'global'
  for (let keyName in config.templateGlobals) {
    if (config.templateGlobals.hasOwnProperty(keyName)) {
      data[`global.${keyName}`] = config.templateGlobals[keyName];
    }
  }

  // For each key in the data object, insert its value into the string at the corresponding placeholder
  for (let key in data) {
    if (data.hasOwnProperty(key) && typeof(data[key]) === 'string') {
      const replace = data[key];
      const find = `{${key}}`;

      string = string.replace(find, replace);
    }
  }

  return string;
};

// Get the contents of a static (public)" asset
helpers.getStaticAsset = (fileName, callback) => {
  fileName = typeof(fileName) === 'string' && fileName.length > 0 ? fileName : false;

  if (fileName) {
    const publicDir = path.join(__dirname, '/../public/');

    fs.readFile(publicDir + fileName, (error, fileData) => {
      if (!error && fileData) {
        callback(false, fileData);
      } else {
        debug('\x1b[31m%s\x1b[0m', 'No file was found');
        callback('No file was found');
      }
    });
  } else {
    debug('\x1b[31m%s\x1b[0m', 'A valid fileName was not specified')
    callback('A valid fileName was not specified');
  }
};

// Set text color for console log
helpers.setConsoleColor = (colorString, stringToColor) => {
  colorString = colorString && typeof(colorString) === 'string' ? colorString.toLowerCase() : null;

  // Available console log colors
  const colors = {
    red: '31',
    green: '32',
    yellow: '33',
    blue: '34',
    pink: '35',
    lightblue: '36'
  };

  if (colorString && colors.hasOwnProperty(colorString)) {
    return `\x1b[${colors[colorString]}m${stringToColor}\x1b[0m`;
  }
};

module.exports = helpers;