/*
 * Frontend Logic for application
 *
 */

// Container for frontend application
const app = {};

// Config
app.config = {
  sessionToken : null
};

/*********
 * AJAX Client (for RESTful API)
 **********/
app.client = {}

// Interface for making API calls
app.client.request = (headers, path, method, queryStringObject, payload, callback) => {

  // Validate all params
  headers = headers && typeof(headers) === 'object' ? headers : {};
  path = typeof(path) === 'string' ? path : '/';
  method = typeof(method) === 'string' && ['POST','GET','PUT','DELETE'].indexOf(method.toUpperCase()) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = queryStringObject && typeof(queryStringObject) == 'object' ? queryStringObject : {};
  payload = payload && typeof(payload) === 'object'? payload : {};
  callback = typeof(callback) === 'function' ? callback : false;

  // For each query string parameter sent, add it to the path
  let requestUrl = `${path}?`;
  let paramCounter = 0;

  for (let queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      paramCounter++;
      // If at least one queryString param has already been added, prepend new ones with an '&'
      if (paramCounter > 1) {
        requestUrl += '&';
      }
      // Add the key and value
      requestUrl += `${queryKey}=${queryStringObject[queryKey]}`;
    }
  }

  // Form http request as JSON type
  const xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader('Content-Type', 'application/json');

  // For each header sent, add it to the request
  for (let headerKey in headers) {
    if (headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }

  // If there is a current session token set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader('token', app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      const statusCode = xhr.status;
      const responseReturned = xhr.responseText;

      // Callback if requested
      if (callback) {
        try {
          const parsedResponse = JSON.parse(responseReturned);
          callback(statusCode, parsedResponse);
        } catch(error) {
          callback(statusCode, false);
        }
      }
    }
  };

  // Send the payload as JSON
  const payloadString = JSON.stringify(payload);
  xhr.send(payloadString);
};

// Bind the logout button
app.bindLogoutButton = () => {
  document.getElementById('logoutButton').addEventListener('click', (e) => {
    // Stop it from redirecting anywhere
    e.preventDefault();

    // Log the user out
    app.logUserOut();

  });
};

// Log the user out then redirect them
app.logUserOut = (redirectUser) => {
  // Set redirectUser to default to true
  redirectUser = typeof(redirectUser) === 'boolean' ? redirectUser : true;

  // Get the current token id
  const tokenId = typeof(app.config.sessionToken.id) === 'string' ? app.config.sessionToken.id : false;

  // Send the current token to the tokens endpoint to delete it
  const queryStringObject = {
    id : tokenId
  };

  app.client.request(null, 'api/tokens', 'DELETE', queryStringObject, null, (statusCode, responsePayload) => {
    // Set the app.config token as false
    app.setSessionToken(false);

    // Send the user to the logged out page
    if (redirectUser) {
      window.location = '/session/deleted';
    }

  });
};

// Bind the forms
app.bindForms = () => {
  if (document.querySelector('form')) {
    const allForms = document.querySelectorAll('form');

    for (let i = 0; i < allForms.length; i++) {
      allForms[i].addEventListener('submit', function (e) {

        // Stop it from submitting
        e.preventDefault();
        const formId = this.id;
        const path = this.action;
        let method = this.method.toUpperCase();

        // Hide the error message (if it's currently shown due to a previous error)
        document.querySelector(`#${formId} .formError`).style.display = 'none';

        // Hide the success message (if it's currently shown due to a previous error)
        if (document.querySelector(`#${formId} .formSuccess`)) {
          document.querySelector(`#${formId} .formSuccess`).style.display = 'none';
        }


        // Turn the inputs into a payload
        const payload = {};
        const elements = this.elements;

        for (let i = 0; i < elements.length; i++) {
          if (elements[i].type !== 'submit') {
            const valueOfElement = elements[i].type === 'checkbox' ? elements[i].checked : elements[i].value;
            if (elements[i].name === '_method') {
              method = valueOfElement;
            } else {
              payload[elements[i].name] = valueOfElement;
            }

          }
        }

        // If the method is DELETE, the payload should be a queryStringObject instead
        const queryStringObject = method === 'DELETE' ? payload : {};

        // Call the API
        app.client.request(null, path, method, queryStringObject, payload, (statusCode, responsePayload) => {
          // Display an error on the form if needed
          if(statusCode !== 200){

            if(statusCode === 403){
              // log the user out
              app.logUserOut();
            } else {
              // Try to get the error from the api, or set a default error message
              const error = typeof(responsePayload.Error) === 'string' ? responsePayload.Error : 'An error has occured, please try again';

              // Set the formError field with the error text
              document.querySelector(`#${formId} .formError`).innerHTML = error;

              // Show (unhide) the form error field on the form
              document.querySelector(`#${formId} .formError`).style.display = 'block';
            }
          } else {
            // If successful, send to form response processor
            app.formResponseProcessor(formId, payload, responsePayload);
          }

        });
      });
    }
  }
};

// Form response processor
app.formResponseProcessor = (formId, requestPayload, responsePayload) => {
  let functionToCall = false;
  // If account creation was successful, try to immediately log the user in
  if (formId === 'accountCreate') {
    // Take the phone and password, and use it to log the user in
    const newPayload = {
      phone : requestPayload.phone,
      password : requestPayload.password
    };

    app.client.request(null, 'api/tokens', 'POST', null, newPayload, (newStatusCode, newResponsePayload) => {
      // Display an error on the form if needed
      if (newStatusCode !== 200) {

        // Set the formError field with the error text
        document.querySelector(`#${formId} .formError`).innerHTML = 'Sorry, an error has occured. Please try again.';

        // Show (unhide) the form error field on the form
        document.querySelector(`#${formId} .formError`).style.display = 'block';
      } else {
        // If successful, set the token and redirect the user
        app.setSessionToken(newResponsePayload);
        window.location = '/checks/all';
      }
    });
  }
  // If login was successful, set the token in localstorage and redirect the user
  if (formId === 'sessionCreate') {
    app.setSessionToken(responsePayload);
    window.location = '/checks/all';
  }

  // If forms saved successfully and they have success messages, show them
  const formsWithSuccessMessages = ['accountEdit1', 'accountEdit2'];
  if (formsWithSuccessMessages.indexOf(formId) > -1) {
    document.querySelector(`#${formId} .formSuccess`).style.display = 'block';
  }

  // If the user just deleted their account, redirect them to the account-delete page
  if (formId === 'accountEdit3') {
    app.logUserOut(false);
    window.location = '/account/deleted';
  }

};

// Get the session token from localstorage and set it in the app.config object
app.getSessionToken = () => {
  const tokenString = localStorage.getItem('token');
  if (typeof(tokenString) === 'string') {
    try {
      const token = JSON.parse(tokenString);
      app.config.sessionToken = token;

      if (typeof(token) === 'object') {
        app.setLoggedInClass(true);
      } else {
        app.setLoggedInClass(false);
      }
    } catch(error) {
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
};

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = (add) => {
  const target = document.querySelector('body');
  if (add) {
    target.classList.add('loggedIn');
  } else {
    target.classList.remove('loggedIn');
  }
};

// Set the session token in the app.config object as well as localstorage
app.setSessionToken = (token) => {
  app.config.sessionToken = token;
  const tokenString = JSON.stringify(token);
  localStorage.setItem('token', tokenString);

  if (typeof(token) === 'object') {
    app.setLoggedInClass(true);
  } else {
    app.setLoggedInClass(false);
  }
};

// Renew the token
app.renewToken = (callback) => {
  const currentToken = typeof(app.config.sessionToken) == 'object' ? app.config.sessionToken : false;

  if (currentToken) {
    // Update the token with a new expiration
    const payload = {
      id : currentToken.id,
      extend : true
    };

    app.client.request(null, 'api/tokens', 'PUT', null, payload, (statusCode, responsePayload) => {
      // Display an error on the form if needed
      if (statusCode === 200) {
        // Get the new token details
        const queryStringObject = {id : currentToken.id};
        app.client.request(null, 'api/tokens', 'GET', queryStringObject, null, (statusCode, responsePayload) => {
          // Display an error on the form if needed
          if (statusCode === 200) {
            app.setSessionToken(responsePayload);
            callback(false);
          } else {
            app.setSessionToken(false);
            callback(true);
          }
        });
      } else {
        app.setSessionToken(false);
        callback(true);
      }
    });
  } else {
    app.setSessionToken(false);
    callback(true);
  }
};

// Load data on the page
app.loadDataOnPage = () => {
  // Get the current page from the body class
  const bodyClasses = document.querySelector('body').classList;
  const primaryClass = typeof(bodyClasses[0]) === 'string' ? bodyClasses[0] : false;

  // Logic for account settings page
  if (primaryClass === 'accountEdit') {
    app.loadAccountEditPage();
  }
};

// Load the account edit page specifically
app.loadAccountEditPage = () => {
  // Get the phone number from the current token, or log the user out if none is there
  const phone = typeof(app.config.sessionToken.phone) == 'string' ? app.config.sessionToken.phone : false;

  if (phone) {
    // Fetch the user data
    const queryStringObject = {
      phone : phone
    };

    app.client.request(null, 'api/users', 'GET', queryStringObject, null, (statusCode, responsePayload) => {
      if (statusCode === 200) {
        // Put the data into the forms as values where needed
        document.querySelector('#accountEdit1 .firstNameInput').value = responsePayload.firstName;
        document.querySelector('#accountEdit1 .lastNameInput').value = responsePayload.lastName;
        document.querySelector('#accountEdit1 .displayPhoneInput').value = responsePayload.phone;

        // Put the hidden phone field into both forms
        const hiddenPhoneInputs = document.querySelectorAll('input.hiddenPhoneNumberInput');

        for (let i = 0; i < hiddenPhoneInputs.length; i++) {
          hiddenPhoneInputs[i].value = responsePayload.phone;
        }

      } else {
        // If the request comes back as something other than 200, log the user our (on the assumption that the api is temporarily down or the users token is bad)
        app.logUserOut();
      }
    });
  } else {
    app.logUserOut();
  }



};

// Loop to renew token often
app.tokenRenewalLoop = () => {
  setInterval(() => {
    app.renewToken((error) => {
      if (!error) {
        console.log("Token renewed successfully @ " + Date.now());
      }
    });
  }, 60000);
};

// Init (bootstrapping)
app.init = () => {
  // Bind all form submissions
  app.bindForms();

  // Bind logout logout button
  app.bindLogoutButton();

  // Get the token from localstorage
  app.getSessionToken();

  // Renew token
  app.tokenRenewalLoop();

  // Load data on page
  app.loadDataOnPage();
};

// Call the init processes after the window loads
window.onload = () => {
  app.init();
};