const server = require('./server'),
    workers = require('./workers');

const app = {};

// Init function
app.init = () => {
  // Start the server
  server.init();
  // Start the workers
  workers.init();
}

// Execute Init
app.init();

module.exports = app;