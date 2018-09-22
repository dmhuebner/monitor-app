const server = require('./server'),
      workers = require('./workers'),
      cli = require('./lib/cli');

const app = {};

// Init function
app.init = () => {
  // Start the server
  server.init();
  // Start the workers
  workers.init();

  // Start the CLI, but make sure it starts last
  setTimeout(() => {
    cli.init();
  }, 50);
}

// Execute Init
app.init();

module.exports = app;