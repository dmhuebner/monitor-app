/**
* Front end logic for the application
***/

// Container for front end application
const app = {};

// Config
app.config = {
  sessionToken: false
};

/*****
* AJAX client for restful APIs
*****/
app.client = {};

// Interface for making HTTP calls
app.client.request = (headers, path, method, queryStringObject, payload, callback) => {

  // Set defaults for all params
  headers = headers && typeof(headers) === 'object' ? headers : {};
  path = typeof(path) === 'string' ? path : '/';
  method = typeof(method) === 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = queryStringObject && typeof(queryStringObject) === 'object' ? queryStringObject : {};
  payload = payload && typeof(payload) === 'object' ? payload : {};
  callback = typeof(callback) === 'function' ? callback : false;

  // Add each queryString parameter to path before it is sent
  let requestUrl = `${path}?`;
  let paramCounter = 0;

  for (let queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      paramCounter++
      // If at least one queryString param has already been added, prepend new ones with an '&'
      if (paramCounter > 1) {
        requestUrl += '&';
      }

      // Add key value
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

  // If there is a current session token, add that as a header as well
  if (app.config.sessionToken) {
    xhr.setRequestHeader('token', app.config.sessionToken.id);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      const statusCode = xhr.status;
      const responseReturned = xhr.responseText;

      // callback if requested
      if (callback) {
        try {
          // Try to parse response into JSON
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