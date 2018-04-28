const http = require('http'),
      url = require('url'),
      StringDecoder = require('string_decoder').StringDecoder,
      config = require('./config');

const server = http.createServer((req, res) => {

  // Get url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '').toLocaleLowerCase();

  // Get the query string as an object
  let queryStringObject = parsedUrl.query;

  // Get HTTP method
  const method = req.method.toLocaleLowerCase();

  // Get request headers as object
  const headers = req.headers;

  // Get request body, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';

  req.on('data', (data) => {
    buffer += decoder.write(data);
  });

  req.on('end', () => {
    buffer += decoder.end();

    // Request is now finished
    const requestBody = buffer;

    // Choose the controller this request should go to. If no controller is found, use not found controller
    const chosenController = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : controllers.notFound;

    // Construct data object to send to controller
    const data = {
      trimmedPath: trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      requestBody: requestBody
    };

    // Route request to controller specified in the router
    chosenController(data, (statusCode, payload) => {
      // Use statusCode called back by controller or default to 200
      statusCode = typeof(statusCode) === 'number' ? statusCode : 200;

      // User payload called back by controller or default to empty object
      payload = typeof(payload) === 'object' ? payload : {};

      // Convert payload to string
      const payloadString = JSON.stringify(payload);

      // Return the response
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the response
      console.log('Returned response: ', statusCode, payloadString);
    });

  });
});

// Start the server
server.listen(config.port, () => {
  console.log(`The server is listening on port ${config.port} in ${config.envName} environment...`);
});

function healthCheckCtrl(data, callback) {
  // Callback HTTP status code and payload
  callback(200, {name: 'health check'});
}

function notFoundCtrl(data, callback) {
  callback(404);
}

// Define controllers
const controllers = {
  healthCheck: healthCheckCtrl,
  notFound: notFoundCtrl
};

// Define request router
const router = {
  healthcheck: controllers.healthCheck
};