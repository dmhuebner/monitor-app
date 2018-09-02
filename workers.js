/*
* These are background worker related tasks
* */

const path = require('path'),
      fs = require('fs'),
      _data = require('./lib/data'),
      https = require('https'),
      http = require('http'),
      helpers = require('./lib/helpers'),
      url = require('url'),
      _logs = require('./lib/logs'),
      util = require('util'),
      debug = util.debuglog('workers'),
      constants = require('./lib/constants');

// Instantiate workers object
const workers = {};

// Loop up all checks, get their data, send to validator
workers.gatherAllChecks = () => {
  // get all the checks
  _data.list('checks', (error, checks) => {
    if (!error && checks && checks.length > 0) {
      checks.forEach((check) => {
        // Read in the check data
        _data.read('checks', check, (error, originalCheckData) => {
          if (!error && originalCheckData) {
            // Pass the data to the check validator, and let that function continue or log errors as needed
            workers.validateCheckData(originalCheckData);
          } else {
            debug('\x1b[31m%s\x1b[0m', 'Error reading one of the check\'s data');
          }
        });
      });
    } else {
      debug('\x1b[31m%s\x1b[0m', 'Error: Could not find any checks to process');
    }
  });
};

// Validating the check data
workers.validateCheckData = (originalCheckData) => {
  originalCheckData = originalCheckData && typeof(originalCheckData) === 'object' ? originalCheckData : {};
  originalCheckData.id = typeof(originalCheckData.id) === 'string' && originalCheckData.id.trim().length === 20 ? originalCheckData.id.trim() : false;
  originalCheckData.userPhone = typeof(originalCheckData.userPhone) === 'string' && originalCheckData.userPhone.trim().length === 10 ? originalCheckData.userPhone.trim() : false;
  originalCheckData.protocol = typeof(originalCheckData.protocol) === 'string' && ['http', 'https'].indexOf(originalCheckData.protocol.trim()) > -1 ? originalCheckData.protocol.trim() : false;
  originalCheckData.url = typeof(originalCheckData.url) === 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
  originalCheckData.method = typeof(originalCheckData.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method.trim()) > -1 ? originalCheckData.method.trim() : false;
  originalCheckData.successCodes = typeof(originalCheckData.successCodes) === 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
  originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) === 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

  // Set the keys that may not be set if the workers have never seen this check before
  originalCheckData.state = typeof(originalCheckData.state) === 'string' && ['up', 'down'].indexOf(originalCheckData.state.trim()) > -1 ? originalCheckData.state.trim() : 'down';
  originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) === 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

  // If all the checks pass, pass the data along to the next step in the process
  if (originalCheckData.id &&
      originalCheckData.userPhone &&
      originalCheckData.protocol &&
      originalCheckData.url &&
      originalCheckData.method &&
      originalCheckData.successCodes &&
      originalCheckData.timeoutSeconds) {

    workers.performCheck(originalCheckData);
  } else {
    debug('\x1b[31m%s\x1b[0m', 'Error: One of the checks is not properly formatted. Skipping it.');
  }
};

// Perform the check, send the originalCheckData and the outcome of the check process to the next step in the process
workers.performCheck = (originalCheckData) => {
  // Prepare the initial Check outcome
  const checkOutcome = {
    error: false,
    responseCode: false
  };

  // Mark that the outcome has not been sent yet
  let outcomeSent = false;

  // Parse the hostname and the path out of the originalCheckData
  const parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
  const hostName = parsedUrl.hostname;
  const path = parsedUrl.path // using path and not pathname because we want the query string

  // Construct the request
  const requestDetails = {
    protocol: originalCheckData.protocol + ':',
    hostname: hostName,
    method: originalCheckData.method.toUpperCase(),
    path: path,
    timeout: originalCheckData.timeoutSeconds * 1000
  };

  // Instantiate request object using http or https module
  const _moduleToUse = originalCheckData.protocol === 'http' ? http : https;
  const req = _moduleToUse.request(requestDetails, (res) => {
    // Grab the status of the sent request
    const status = res.statusCode;

    // Update the check outcome and pass the data along
    checkOutcome.responseCode = status;

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error', (error) => {
    // Update the check outcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: error
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  // Bind to the timeout event
  req.on('timeout', () => {
    // Update the check outcome and pass the data along
    checkOutcome.error = {
      error: true,
      value: 'timeout'
    };

    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.end();
};

// Process the checkOutcome and update the check data as needed and then trigger an alert to the user if needed
// Special logic for accommodating a check that has never been tested before (don't alert in this case)
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  // Decide if the check is considered up or down in its current state
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';

  // Determine if an alert is warranted
  const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

  // Log the outcome
  const timeOfCheck = Date.now();
  workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);

  // Update the check data
  const newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = timeOfCheck;

  // Save the updates
  _data.update('checks', newCheckData.id, newCheckData, (error) => {
    if (!error) {
      // Send the check data to the next phase of the process if needed
      if (alertWarranted) {
        workers.alertUsersToStatusChange(newCheckData);
      } else {
        debug('\x1b[33m%s\x1b[0m', `${newCheckData.method.toUpperCase()} ${newCheckData.url}`);
        debug('Check outcome has not changed. No alert needed');
      }

    } else {
      debug('\x1b[31m%s\x1b[0m', 'Error trying to save updates to one of the checks');
    }
  });
};

// Alert the user about a check in their check status
workers.alertUsersToStatusChange = (newCheckData) => {
  const message = `Alert: Your monitor for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
  helpers.sendTwilioSms(newCheckData.userPhone, message, (error) => {
    if (!error) {
      debug('\x1b[32m%s\x1b[0m', 'Success! User was alerted to a status change in their check via sms\n', message);
    } else {
      debug('\x1b[31m%s\x1b[0m', 'Error: Could not send an alert to a user who had a state change in one of their checks', error);
    }
  });
};

workers.log = (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) => {
  // Form the log data
  const logData = {
    check: originalCheckData,
    outcome: checkOutcome,
    state: state,
    alert: alertWarranted,
    time: timeOfCheck
  };

  // Convert data to a string
  const logString = JSON.stringify(logData);

  // Determine the name of the log file
  const logFileName = originalCheckData.id;

  // Append the logString to the file
  _logs.append(logFileName, logString, (error) => {
    if (!error) {
      debug('\x1b[37m%s\x1b[0m', 'Logging to file succeeded');
    } else {
      debug('\x1b[31m%s\x1b[0m', 'Logging to file failed');
    }
  })
};

// Timer to execute the worker process once per minute
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks();
  }, constants.CHECK_MONITORS_INTERVAL);
};

// Rotate aka compress the log files
workers.rotateLogs = () => {
  // List all non-compressed log files in .logs
  _logs.list(false, (error, logsList) => {
    if (!error && logsList && logsList.length) {
      logsList.forEach((logName) => {
        // Compress the data to a different file
        const logId = logName.replace('.log', '');
        const newFileId = `${logId}-${Date.now()}`;

        _logs.compress(logId, newFileId, (error) => {
          if (!error) {
            // Truncate the log
            _logs.truncate(logId, (error) => {
              if (!error) {
                debug('\x1b[37m%s\x1b[0m', 'Success truncating log file');
              } else {
                debug('\x1b[31m%s\x1b[0m', 'Error truncating log file');
              }
            });
          } else {
            debug('\x1b[31m%s\x1b[0m', 'Error compressing one of the log files', error);
          }
        });
      });
    } else {
      debug('\x1b[31m%s\x1b[0m', 'Error: Could not find any logs to rotate');
    }
  });


};

// Timer to execute the log-rotation process once per day
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs();
  }, constants.LOG_ROTATION_INTERVAL);
};

// Init script
workers.init = () => {

  // Log to console in blue
  console.log('\x1b[34m%s\x1b[0m', 'Background workers are running');

  // Execute all checks on startup
  workers.gatherAllChecks()
  // Call a loop so checks continue to execute on their own
  workers.loop()

  // Compress all the logs immediately
  workers.rotateLogs();

  // Call the compression loop so logs will be compressed later on
  workers.logRotationLoop();
};

module.exports = workers;