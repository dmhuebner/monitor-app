/*===================
 CLI related tasks
===================*/

const readline = require('readline'),
      util = require('util'),
      debug = util.debuglog('cli'),
      events = require('events');

class _events extends events {};
const e = new _events();

// Instantiate CLI module object
const cli = {};

/*=== Input Event Handlers ===*/
e.on('man', (string) => {
  cli.responders.help();
});

e.on('help', (string) => {
  cli.responders.help();
});

e.on('exit', () => {
  cli.responders.exit();
});

e.on('stats', (string) => {
  cli.responders.stats();
});

e.on('list users', (string) => {
  cli.responders.listUsers();
});

e.on('more user info', (string) => {
  cli.responders.moreUserInfo(string);
});

e.on('list checks', (string) => {
  cli.responders.listChecks(string);
});

e.on('more check info', (string) => {
  cli.responders.moreCheckInfo(string);
});

e.on('list logs', (string) => {
  cli.responders.listLogs();
});

e.on('more log info', (string) => {
  cli.responders.moreLogInfo(string);
});

/*=== Responders ===*/
cli.responders = {};

// Help / Man
cli.responders.help = () => {
  console.log('You entered the help command');
};

// Exit
cli.responders.exit = () => {
  console.log('You entered the exit command');
};

// Stats
cli.responders.stats = () => {
  console.log('You entered the stats command');
};

// List Users
cli.responders.listUsers = () => {
  console.log('You entered the listUsers command');
};

// More User Info
cli.responders.moreUserInfo = (string) => {
  console.log('You entered the moreUserInfo command', string);
};

// List Checks
cli.responders.listChecks = (string) => {
  console.log('You entered the listChecks command', string);
};

// More Check Info
cli.responders.moreCheckInfo = (string) => {
  console.log('You entered the exit command', string);
};

// List Logs
cli.responders.listLogs = () => {
  console.log('You entered the listLogs command');
};

// More Log Info
cli.responders.moreLogInfo = (string) => {
  console.log('You entered the moreLogInfo command', string);
};

// Input processor
cli.processInput = (string) => {
  // Sanitize & validate the input
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

