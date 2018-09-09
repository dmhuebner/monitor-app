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

  // Set defaults for all params
  headers = typeof(headers) == 'object' && headers !== null ? headers : {};
  path = typeof(path) == 'string' ? path : '/';
  method = typeof(method) == 'string' && ['POST','GET','PUT','DELETE'].indexOf(method.toUpperCase()) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = typeof(queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
  payload = typeof(payload) == 'object' && payload !== null ? payload : {};
  callback = typeof(callback) == 'function' ? callback : false;

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

// Bind the forms
app.bindForms = () => {
  if (document.querySelector("form")) {
    document.querySelector("form").addEventListener("submit", function(e) {

      // Stop it from submitting
      e.preventDefault();
      const formId = this.id;
      const path = this.action;
      const method = this.method.toUpperCase();

      // Hide the error message (if it's currently shown due to a previous error)
      document.querySelector(`#${formId} .formError`).style.display = 'hidden';

      // Turn the inputs into a payload
      const payload = {};
      const elements = this.elements;

      for (let i = 0; i < elements.length; i++) {
        if (elements[i].type !== 'submit') {
          const valueOfElement = elements[i].type === 'checkbox' ? elements[i].checked : elements[i].value;
          payload[elements[i].name] = valueOfElement;
        }
      }

      // Call the API
      app.client.request(null, path, method, null, payload, (statusCode, responsePayload) => {
        // Display an error on the form if needed
        if (statusCode !== 200) {

          // Try to get the error from the api, or set a default error message
          const error = typeof(responsePayload.Error) === 'string' ? responsePayload.Error : 'An error has occured, please try again';

          // Set the formError field with the error text
          document.querySelector(`#${formId} .formError`).innerHTML = error;

          // Show (unhide) the form error field on the form
          document.querySelector(`#${formId} .formError`).style.display = 'block';
        } else {
          // If successful, send to form response processor
          app.formResponseProcessor(formId,payload,responsePayload);
        }
      });
    });
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
        document.querySelector(`#${formI} .formError`).innerHTML = 'Sorry, an error has occured. Please try again.';

        // Show (unhide) the form error field on the form
        document.querySelector(`#${formI} .formError`).style.display = 'block';

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
};

// Get the session token from localstorage and set it in the app.config object
app.getSessionToken = () => {
  const tokenString = localStorage.getItem('token');

  if (typeof(tokenString) === 'string') {
    try {
      const token = JSON.parse(tokenString);
      app.config.sessionToken = token;

      if (typeof(token) == 'object') {
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
  const target = document.querySelector("body");
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

// Loop to renew token often
app.tokenRenewalLoop = () => {
  setInterval(() => {
    app.renewToken((error) => {
      if (!error) {
        console.log(`Token renewed successfully @ ${Date.now()}`);
      }
    });
  }, 60000);
};

// Init (bootstrapping)
app.init = () => {
  // Bind all form submissions
  app.bindForms();

  // Get the token from localstorage
  app.getSessionToken();

  // Renew token
  app.tokenRenewalLoop();
};

// Call the init processes after the window loads
window.onload = () => {
  app.init();
};