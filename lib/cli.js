// These are CLI related tasks
const readline = require('readline'),
      util = require('util'),
      debug = util.debuglog('cli'),
      events = require('events');

class _events extends events {};
const e = new _events();

// Instantiate CLI module object
const cli = {};

// Input processor
cli.processInput = (string) => {
  string = typeof(string) === 'string' && string.trim().length ? string.trim() : null;

  // Process the input if the user wrote something, otherwise ignore it
  if (string) {
    // Codify the unique strings that match the different commands a user can input
    const uniqueInputs = [
      'man',
      'help',
      'exit',
      'stats',
      'list users',
      'more user info',
      'list checks',
      'more check info',
      'list logs',
      'more log info'
    ];

    // Go through the possible inputs an emit an event when a match is found
    let matchFound = false;
    let counter = 0;

    uniqueInputs.some((input) => {
      if (string.toLowerCase().indexOf(input) !== -1) {
        matchFound = true;

        // Emit an event matching the unique input and include the full string given by user
        e.emit(input, string);
        return true;
      }
    });

    // If no match is found, tell user to try again
    if (!matchFound) {
      console.log('Invalid input. Please try again.');
    }
  }
};

// Init script
cli.init = () => {
  // Send the start message to the console in dark blue
  console.log('\x1b[33m%s\x1b[0m', `The CLI is running`);

  // Start the CLI interface
  const _interface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: ''
  });

  // Create an initial prompt
  _interface.prompt();

  // Handle each line of input separately
  _interface.on('line', (string) => {
    // Send to the input processor
    cli.processInput(string);
  });

  // Re-initialize the prompt
  _interface.prompt();

  // If the user stops the CLI, kill the associated process
  _interface.on('close', () => {
    process.exit(0);
  });

};

module.exports = cli;

