/***
* Request Handlers
***/

const _data = require('./data'),
      helpers = require('./helpers'),
      config = require('../config'),
      util = require('util'),
      debug = util.debuglog('handlers');

// Handlers container
const handlers = {};

/*********************
 *
 * HTML HANDLERS
 *
 *********************/

// Index handler
handlers.index = (data, callback) => {
  // Reject any request that is not a GET
  if (data.method === 'get') {

    // Prepare data for string interpolation
    const templateData = {
      'head.title': 'Monitor Lizard',
      'head.description': 'Simple API monitor tool',
      'body.title': 'Well hello there.',
      'body.class': 'index'
    };

    // Read in index.html template as a string
    helpers.getTemplate('index', templateData, (error, string) => {
      if (!error && string) {
        helpers.addUniversalTemplates(string, templateData, (error, newFullHtmlString) => {
          if (!error && newFullHtmlString) {
            // Return combined html page
            callback(200, newFullHtmlString, 'html');
          } else {
            callback(500, undefined, 'html');
          }
        });
      } else {
        callback(500, undefined, 'html');
      }
    });
  } else {
    callback(405, undefined, 'html');
  }
};

// Favicon
handlers.favicon = (data, callback) => {
  // Reject any request that is not a GET
  if (data.method === 'get') {
    // Read in the favicon data
    helpers.getStaticAsset('favicon.ico', (error, faviconData) => {
      if (!error && faviconData) {
        // callback favicon data
        callback(200, faviconData, 'favicon');
      } else {
        callback(500);
      }
    });
  } else {
    callback(405, undefined, 'html');
  }
};

// Public Assets
handlers.public = (data, callback) => {
  // Reject any request that is not a GET
  if (data.method === 'get') {

    // Get the fileName being requested
    const trimmedAssetName = data.trimmedPath.replace('public/', '').trim();

    if (trimmedAssetName.length > 0) {
      // Read in the asset's data
      helpers.getStaticAsset(trimmedAssetName, (error, assetData) => {
        if (!error && assetData) {
          // Determine the content type and default to plain text
          let contentType = 'plain';

          if (trimmedAssetName.indexOf('.css') > -1) {
            contentType = 'css';
          }

          if (trimmedAssetName.indexOf('.png') > -1) {
            contentType = 'png';
          }

          if (trimmedAssetName.indexOf('.jpg') > -1) {
            contentType = 'jpg';
          }

          if (trimmedAssetName.indexOf('.favicon') > -1) {
            contentType = 'favicon';
          }

          // Callback the data
          callback(200, assetData, contentType);

        } else {
          debug('\x1b[31m%s\x1b[0m', error);
          callback(404);
        }
      });
    } else {
      debug('\x1b[31m%s\x1b[0m', 'Error: no trimmed asset name');
      callback(404);
    }
  } else {
    callback(405, null, 'html');
  }
};

/*********************
 *
 * JSON API HANDLERS
 *
 *********************/

handlers.ping = (data, callback) => {
  // Callback HTTP status code and payload
  callback(200, {routeName: 'ping'});
}

handlers.notFound = (data, callback) => {
  callback(404);
}

handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._users[data.method](data, callback);
  } else {
    callback(405);
  }
};

//Container for the users sub-methods
handlers._users = {};

// Users - post
// Requested data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = (data, callback) => {
  // Check that all required fields are filled out
  const request = {
    firstName: typeof (data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false,
    lastName: typeof (data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false,
    phone: typeof (data.payload.phone) === 'string' && data.payload.phone.length === 10 ? data.payload.phone.trim() : false,
    password: typeof (data.payload.password) === 'string' && data.payload.password.length > 5 ? data.payload.password.trim() : false,
    tosAgreement: typeof (data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true ? true : false
  };

  if (request.firstName && request.lastName && request.phone && request.password && request.tosAgreement) {
    // Make sure that the user doesn't already exist
    _data.read('users', request.phone, (error, data) => {
      if (error) {
        // Hash the password
        const hashedPassword = helpers.hash(request.password);

        if (hashedPassword) {
          // Create user object
          const userObject = {
            firstName: request.firstName,
            lastName: request.lastName,
            phone: request.phone,
            hashedPassword: hashedPassword,
            tosAgreement: request.tosAgreement,
            checks: []
          };

          // Store the user
          _data.create('users', request.phone, userObject, (error) => {
            if (!error) {
              callback(200);
            } else {
              console.log(error);
              callback(500, {error: 'Could not create the new user'});
            }
          });
        } else {
          callback(500, {error: 'Could not hash the password'});
        }
      } else {
        callback(400, {error:  'A user with that phone number already exists'});
      }
    });
  } else {
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = (data, callback) => {
  // Check that the phone number provided is valid
  const request = {
    phone: typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false
  };

  if (request.phone) {
    // Get the token from the headers
    const tokenId = typeof(data.headers.token) === 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(tokenId, request.phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', request.phone, (error, data) => {
          if (!error, data) {
            // Remove the hashed password from the user object before returning it to the request
            delete data.hashedPassword;
            callback(200, data);
          } else {
            callback(404);
          }
        });
      } else {
        callback(403, {error: 'Missing required token in header, or token is invalid'});
      }
    });
  } else {
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
handlers._users.put = (data, callback) => {
  // Check for the required field
  const request = {
    phone: typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false
  };

  // Check for optional fields
  // const fieldsToUpdate =
  const firstName = typeof (data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
  const lastName = typeof (data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
  const password = typeof (data.payload.password) === 'string' && data.payload.password.length > 5 ? data.payload.password.trim() : false;

  // Error if the phone is invalid
  if (request.phone) {

    // Error if there is nothing to update
    if (firstName || lastName || password) {

      // Get the token from the headers
      const tokenId = typeof(data.headers.token) === 'string' ? data.headers.token : false;
      // Verify that the given token is valid for the phone number
      handlers._tokens.verifyToken(tokenId, request.phone, (tokenIsValid) => {
        if (tokenIsValid) {
          // Lookup the user
          _data.read('users', request.phone, (error, userData) => {
            if (!error && userData) {
              // Update fields
              if (firstName) {
                userData.firstName = firstName;
              }

              if (lastName) {
                userData.lastName = lastName;
              }

              if (password) {
                userData.hashedPassword = helpers.hash(password);
              }

              // Store the new updates
              _data.update('users', request.phone, userData, (error) => {
                if (!error) {
                  callback(200);
                } else {
                  console.log(error);
                  callback(500, {error: 'Could not update the user'});
                }
              });

            } else {
              callback(400, {error: 'The specified user does not exist'});
            }
          });
        } else {
          callback(403, {error: 'Missing required token in header, or token is invalid'});
        }
      });
    } else {
      callback(400, {error: 'Missing fields to update'});
    }
  } else {
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

// Users - delete
// Required data: phone
handlers._users.delete = (data, callback) => {
  // Check that the phone number is valid
  const request = {
    phone: typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false
  };

  if (request.phone) {

    // Get the token from the headers
    const tokenId = typeof(data.headers.token) === 'string' ? data.headers.token : false;
    // Verify that the given token is valid for the phone number
    handlers._tokens.verifyToken(tokenId, request.phone, (tokenIsValid) => {
      if (tokenIsValid) {
        // Lookup the user
        _data.read('users', request.phone, (error, userData) => {
          if (!error, userData) {
            _data.delete('users', request.phone, (error) => {
              if (!error) {

                // Delete each check that is associated with the user
                const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : false;
                let deletionErrors = false;

                if (userChecks.length) {
                  userChecks.forEach((userCheck) => {
                    _data.delete('checks', userCheck, (error) => {
                      if (error) {
                        deletionErrors = true;
                      }
                    });
                  });

                  if (!deletionErrors) {
                    callback(204);
                  } else {
                    callback(500, {error: 'Errors occurred while attempting to delete checks from user object. All checks may not have been deleted from the user object successfully'});
                  }
                } else {
                  callback(204);
                }
              } else {
                callback(500, {error: 'Could not delete the specified user'});
              }
            });
          } else {
            callback(400, {error: 'Could not find the specified user'});
          }
        });
      } else {
        callback(403, {error: 'Missing required token in header, or token is invalid'});
      }
    });
  } else {
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

// Tokens
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._tokens[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all token methods
handlers._tokens = {};

// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = (data, callback) => {
  const request = {
    phone: typeof (data.payload.phone) === 'string' && data.payload.phone.length === 10 ? data.payload.phone.trim() : false,
    password: typeof (data.payload.password) === 'string' && data.payload.password.length > 5 ? data.payload.password.trim() : false
  };

  if (request.phone && request.password) {
    // Lookup the user who matches the phone number
    _data.read('users', request.phone, (error, userData) => {
      if (!error && userData) {
        // Hash the sent password, and compare it to the password stored in user object
        const hashedPassword = helpers.hash(request.password);

        if (hashedPassword === userData.hashedPassword) {
          // If valid, create a new token with a random name. Set expiration date 1 hour in the future
          const tokenId = helpers.createRandomString(20);
          const expires = Date.now() + 1000 * 60 * 60;
          const tokenObject = {
            phone: request.phone,
            id: tokenId,
            expires: expires
          };

          // Store the token
          _data.create('tokens', tokenId, tokenObject, (error) => {
            if (!error) {
              callback(200, tokenObject);
            } else {
              callback(500, {error: 'Could not create the new token'});
            }
          });
        } else {
          callback(401, {error: 'Invalid password'});
        }
      } else {
        callback(400, {error: 'Could not find the specified user'});
      }
    });
  } else {
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = (data, callback) => {
  // Check that the id is valid
  const request = {
    id: typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false
  };

  if (request.id) {
    // Lookup the token
    _data.read('tokens', request.id, (error, tokenData) => {
      if (!error, tokenData) {
        callback(200, tokenData);
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = (data, callback) => {
  const request = {
    id: typeof (data.payload.id) === 'string' && data.payload.id.length === 20 ? data.payload.id.trim() : false,
    extend: typeof (data.payload.extend) === 'boolean' && data.payload.extend === true ? true : false,
  };

  if (request.id && request.extend) {
    // Lookup the token
    _data.read('tokens', request.id, (error, tokenData) => {
      if (!error && tokenData) {
        // Check to make sure the token isn't already expired
        if (tokenData.expires > Date.now()) {
          // Set the expiration an hour from now
          tokenData.expires = Date.now() + 1000 * 60 * 60;

          // Store the new updates
          _data.update('tokens', request.id, tokenData, (error) => {
            if (!error) {
              callback(200);
            } else {
              callback(500, {error: 'Could not update the token\'s expiration'});
            }
          });
        } else {
          callback(400, {error: 'The token has already expired and cannot be extended'});
        }
      } else {
        callback(400, {error: 'Specified token does not exist'});
      }
    });
  } else {
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

// Tokens - delete
// Required data: id
// Optional data: none
handlers._tokens.delete = (data, callback) => {
  // Check that the id is valid
  const request = {
    id: typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false
  };

  if (request.id) {
    // Lookup the user
    _data.read('tokens', request.id, (error, data) => {
      if (!error, data) {
        _data.delete('tokens', request.id, (error) => {
          if (!error) {
            callback(204);
          } else {
            callback(500, {error: 'Could not delete the specified token'});
          }
        });
      } else {
        callback(400, {error: 'Could not find the specified token'});
      }
    });
  } else {
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

// Verify if a given token id is currently valid for a given user
handlers._tokens.verifyToken = (tokenId, phone, callback) => {
  // Lookup the token
  _data.read('tokens', tokenId, (error, tokenData) => {
    if (!error, tokenData) {
      // Check that the token is for the given user and has not expired
      if (tokenData.phone === phone && tokenData.expires > Date.now()) {
        callback(true);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
};

// Checks
handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete'];
  if (acceptableMethods.indexOf(data.method) > -1) {
    handlers._checks[data.method](data, callback);
  } else {
    callback(405);
  }
};

// Container for all checks methods
handlers._checks = {};

// Checks - post
// Required Data: protocol, url, method, successCodes, timeoutSeconds
// Optional Data: none
handlers._checks.post = (data, callback) => {
  // Validate the inputs
  const request = {
    protocol: typeof(data.payload.protocol) === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false,
    url: typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false,
    method: typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false,
    successCodes: typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false,
    timeoutSeconds: typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false
  };

  if (request.protocol && request.url && request.method && request.successCodes && request.timeoutSeconds) {
    // Get the token from the headers
    const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;

    // Lookup the user by reading the token
    _data.read('tokens', token, (error, tokenData) => {
      if (!error && tokenData) {
        const userPhone = tokenData.phone;

        // Lookup the user data
        _data.read('users', userPhone, (error, userData) => {
          if (!error && userData) {

            // Find user's checks
            const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : false;
            // Verify that the user has less than the number of max checks per user
            console.log('config.maxChecks', config.maxChecks);
            console.log('userChecks.length', userChecks.length);
            if (userChecks.length < config.maxChecks) {
              // Create a random id for the check
              const newCheckId = helpers.createRandomString(20);

              // Create the check object and include user's phone
              const checkObject = {
                id: newCheckId,
                userPhone: userPhone,
                protocol: request.protocol,
                url: request.url,
                method: request.method,
                successCodes: request.successCodes,
                timeoutSeconds: request.timeoutSeconds
              };

              _data.create('checks', newCheckId, checkObject, (error) => {
                if (!error) {
                  // Add the checkId to the user's object
                  userData.checks = userChecks;
                  userData.checks.push(newCheckId);

                  // Save the new user data
                  _data.update('users', userPhone, userData, (error) => {
                    if (!error) {
                      // Return the new check object
                      callback(200, checkObject);
                    } else {
                      callback(500, {error: 'Could not update the user with the new check'});
                    }
                  })
                } else {
                  callback(500, {error: 'Could not create the new check'});
                }
              });
            } else {
              callback(400, {error: `The user already has the maximum number of checks (${config.maxChecks})`});
            }
          } else {
            callback(403, {error: 'Unauthorized'});
          }
        });
      } else {
        callback(403, {error: 'Unauthorized'});
      }
    });
  } else {
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

// Checks - get
// Required Data: id
// Optional Data: none
handlers._checks.get = (data, callback) => {
  // Check that the id provided is valid
  const request = {
    id: typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false
  };

  if (request.id) {

    // Lookup the check
    _data.read('checks', request.id, (error, checkData) => {
      if (!error && checkData) {

        // Get the token from the headers
        const tokenId = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        // Verify that the given token is valid and belongs to the user who created the check
        handlers._tokens.verifyToken(tokenId, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {
            // Return the check data
            callback(200, checkData);
          } else {
            callback(403);
          }
        });
      } else {
        callback(404);
      }
    });
  } else {
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

// Checks - put
// Required Data: id
// Optional Data: protocol, url, method, successCodes, timeoutSeconds (at least one must sent)
handlers._checks.put = (data, callback) => {
  // Check for required field
  const request = {
    id: typeof (data.payload.id) === 'string' && data.payload.id.trim().length > 10 ? data.payload.id.trim() : false
  };
  // Check for optional fields
  request.protocol = typeof(data.payload.protocol) === 'string' && ['http', 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
  request.url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
  request.method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
  request.successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
  request.timeoutSeconds = typeof(data.payload.timeoutSeconds) === 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

  // check if id is valid
  if (request.id) {
    // check that there is at least one value to change
    if (request.protocol || request.url || request.method || request.successCodes || request.timeoutSeconds) {

      // Lookup the check
      _data.read('checks', request.id, (error, checkData) => {
        if (!error && checkData) {
          // Get the token from the headers
          const tokenId = typeof(data.headers.token) === 'string' ? data.headers.token : false;
          // Verify that the given token is valid and belongs to the user who created the check
          handlers._tokens.verifyToken(tokenId, checkData.userPhone, (tokenIsValid) => {
            if (tokenIsValid) {

              // Update the check where necessary
              for (let key in checkData) {
                if (request[key]) {
                  checkData[key] = request[key];
                }
              }

              // Store the updates
              _data.update('checks', request.id, checkData, (error) => {
                if (!error) {
                  callback(200);
                } else {
                  callback(500, {error: 'Could not update the check'});
                }
              });
            } else {
              callback(403);
            }
          });
        } else {
          callback(404, {error: `Check ID: ${request.id} not found`});
        }
      });
    } else {
      callback(400, {error: 'Bad Request: Missing fields to update'});
    }
  } else {
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

// Checks - delete
// Required Data: id
// Optional Data: (none)
handlers._checks.delete = (data, callback) => {
  // Check that the phone number is valid
  const request = {
    id: typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false
  };

  if (request.id) {
    // Lookup the check
    _data.read('checks', request.id, (error, checkData) => {
      if (!error && checkData) {

        // Get the token from the headers
        const tokenId = typeof(data.headers.token) === 'string' ? data.headers.token : false;

        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(tokenId, checkData.userPhone, (tokenIsValid) => {
          if (tokenIsValid) {

            // Delete the check data
            _data.delete('checks', request.id, (error) => {
              if (!error) {

                // Lookup the user
                _data.read('users', checkData.userPhone, (error, userData) => {
                  if (!error, userData) {
                    const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : false;

                    // Remove the deleted check from user's list of checks
                    const checkPosition = userChecks.indexOf(request.id);
                    if (checkPosition > -1) {
                      userChecks.splice(checkPosition, 1);

                      // Update the user's data after removing check from user object
                      _data.update('users', checkData.userPhone, userData, (error) => {
                        if (!error) {
                          callback(200);
                        } else {
                          callback(500, {error: 'Could not update the user that created the check'});
                        }
                      });
                    } else {
                      callback(500, {error: 'Could not find the check on the user\'s object, so could not remove it'});
                    }
                  } else {
                    callback(500, {error: 'Could not find the specified user that created the check. As a result, could not remove the check from user\'s checksList'});
                  }
                });
              } else {
                callback(500, {error: 'Error deleting the check'});
              }
            });
          } else {
            callback(403);
          }
        });
      } else {
        callback(404, {error: `Check ID: ${request.id} not found`});
      }
    });
  } else {
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

/*
* Private
**/

// Checks payload and builds a string of invalid fields
function checkRequest(request) {
  let invalidFields = '';

  for (let key in request) {
    if (!request[key]) {
      invalidFields += ' ' + key;
    }
  }

  return invalidFields;
};

module.exports = handlers;