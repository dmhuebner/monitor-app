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
// TODO only let an authenticated user access their object, don't let them access anyone else's
handlers._users.get = (data, callback) => {
  // Check that the phone number provided is valid
  const request = {
    phone: typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false
  };

  if (request.phone) {
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
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

// Users - put
// Required data: phone
// Optional data: firstName, lastName, password (at least one must be specified)
// TODO only let an authenticated user update their own object, don't let them update anyone else's
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
      callback(400, {error: 'Missing fields to update'});
    }
  } else {
    callback(400, {error: `Bad Request${checkRequest(request) ? ':' + checkRequest(request) : ''}`});
  }
};

// Users - delete
// Required data: phone
// TODO Only let an authenticated user delete their object. Don't let them delete anyone else's
// TODO Cleanup (delete) any other data files associated with this user
handlers._users.delete = (data, callback) => {
  // Check that the phone number is valid
  const request = {
    phone: typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false
  };

  if (request.phone) {
    // Lookup the user
    _data.read('users', request.phone, (error, data) => {
      if (!error, data) {
        _data.delete('users', request.phone, (error) => {
          if (!error) {
            callback(200)
          } else {
            callback(500, {error: 'Could not delete the specified user'});
          }
        });
      } else {
        callback(400, {error: 'Could not find the specified user'});
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