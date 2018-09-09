const http = require('http'),
  https = require('https'),
  url = require('url'),
  StringDecoder = require('string_decoder').StringDecoder,
  fs = require('fs'),
  config = require('./config'),
  handlers = require('./lib/handlers'),
  helpers = require('./lib/helpers'),
  path = require('path'),
  util = require('util'),
  debug = util.debuglog('server');

// Instantiate server module object
const server = {};

// Instantiate http server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res);
});

// Instantiate https server
server.httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem')
};

server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res);
});

// All server logic for both http and https servers
server.unifiedServer = (req, res) => {
  // Get url and parse it
  const parsedUrl = url.parse(req.url, true);

  // Get the path
  const path = parsedUrl.pathname;
  const trimmedPath = path.replace(/^\/+|\/+$/g, '').toLowerCase();

  // Get the query string as an object
  let queryStringObject = parsedUrl.query;

  // Get HTTP method
  const method = req.method.toLowerCase();

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
    const requestBody = helpers.parseJsonToObject(buffer);

    // Choose the handler this request should go to. If no handler is found, use not found handler
    let chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

    // If the request is within the public directory, use the public handler instead
    chosenHandler = trimmedPath.indexOf('public/') > -1 ? handlers.public : chosenHandler;

    // Construct data object to send to handler
    const data = {
      trimmedPath: trimmedPath,
      queryStringObject: queryStringObject,
      method: method,
      headers: headers,
      payload: requestBody
    };

    // Route request to handler specified in the router
    chosenHandler(data, (statusCode, payload, contentType) => {
      // Determine the type of response default to JSON
      contentType = typeof(contentType) === 'string' ? contentType : 'json';
      // Use statusCode called back by handler or default to 200
      statusCode = typeof(statusCode) === 'number' ? statusCode : 200;

      // Return the response parts that are content-specific
      let payloadString = '';

      // contentType is json
      if (contentType === 'json') {
        res.setHeader('Content-Type', 'application/json');
        payload = typeof(payload) === 'object' ? payload : {};
        payloadString = JSON.stringify(payload);
      }

      // contentType is html
      if (contentType === 'html') {
        res.setHeader('Content-Type', 'text/html');
        payloadString = typeof(payload) === 'string' ? payload : '';
      }

      // contentType is favicon
      if (contentType === 'favicon') {
        res.setHeader('Content-Type', 'image/x-icon');
        payloadString = payload ? payload : '';
      }

      // contentType is css
      if (contentType === 'css') {
        res.setHeader('Content-Type', 'text/css');
        payloadString = payload ? payload : '';
      }

      // contentType is png
      if (contentType === 'png') {
        res.setHeader('Content-Type', 'image/png');
        payloadString = payload ? payload : '';
      }

      // contentType is jpeg
      if (contentType === 'jpg') {
        res.setHeader('Content-Type', 'image/jpeg');
        payloadString = payload ? payload : '';
      }

      // contentType is plain
      if (contentType === 'plain') {
        res.setHeader('Content-Type', 'text/plain');
        payloadString = payload ? payload : '';
      }

      // Return the response parts that are common to all contentTypes
      res.writeHead(statusCode);
      res.end(payloadString);

      // Log the response
      // If the response is 200 or 201 print green otherwise print red
      if (statusCode === 200 || statusCode === 201 || statusCode === 204) {
        debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`);
      } else {
        debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statusCode}`);
      }
    });

  });
}

// Define request router
server.router = {
  '': handlers.index,
  'favicon.ico': handlers.favicon,
  'public': handlers.public,
  'account/create': handlers.accountCreate,
  'account/edit': handlers.accountEdit,
  'account/delete': handlers.accountDelete,
  'session/create': handlers.sessionCreate,
  'session/deleted': handlers.sessionDeleted,
  'checks/all': handlers.checkList,
  'checks/create': handlers.checksCreate,
  'checks/edit': handlers.checksEdit,
  'ping': handlers.ping,
  'api/users': handlers.users,
  'api/tokens': handlers.tokens,
  'api/checks': handlers.checks
};

// Init script
server.init = () => {
  // Start the http server
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[36m%s\x1b[0m', `The http server is listening on port ${config.httpPort} in ${config.envName} environment...`);
  });

  // Start the https server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[36m%s\x1b[0m', `The https server is listening on port ${config.httpsPort} in ${config.envName} environment...`);
  });
};

module.exports = server;