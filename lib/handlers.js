/***
* Request Handlers
***/

const _data = require('./data'),
  helpers = require('./helpers')

// Handlers container
const handlers = {};

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
            tosAgreement: request.tosAgreement
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
// TODO Cleanup (delete) any other data files associated with this user
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
        _data.read('users', request.phone, (error, data) => {
          if (!error, data) {
            _data.delete('users', request.phone, (error) => {
              if (!error) {
                callback(204);
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