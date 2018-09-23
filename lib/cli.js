/*===================
 CLI related tasks
===================*/

const readline = require('readline'),
      util = require('util'),
      debug = util.debuglog('cli'),
      events = require('events'),
      os = require('os'),
      v8 = require('v8');

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

/*=== CLI Stylers ===*/

// Create vertical space
cli.verticalSpace = (lines) => {
  lines = lines && typeof(lines) === 'number' ? lines : 1;

  for (let i = 0; i < lines; i++) {
    console.log('');
  }
};

// Create a horizontal line across the terminal
cli.horizontalLine = () => {
  // Get the available screen size
  const width = process.stdout.columns;
  let line = '';

  for (let i = 0; i < width; i++) {
    line += '=';
  }

  console.log(line);
};

// Create centered text on the screen
cli.centered = (string) => {
  string = string.trim() && typeof(string) === 'string' ? string.trim() : '';

  // Get the available screen size
  const width = process.stdout.columns;

  // Calculate the required left padding
  const leftPadding = Math.floor((width - string.length) / 2);

  // Add leftPadding before the string
  let line = '';

  for (let i = 0; i < leftPadding; i++) {
    line += ' ';
  }

  line += string;

  console.log(line);
};

/*=== Responders ===*/
cli.responders = {};

// Help / Man
cli.responders.help = () => {
  const commands = {
    'exit': 'Kill the application',
    'man': 'Show this help page',
    'help': 'Alias of the "man" command',
    'stats': 'Get statistics on underlying operating system and resource utilization.',
    'list users': 'Show a list of all registered (undeleted) users in the system.',
    'more user info --{userId}': 'Show details of a specific user.',
    'list checks --up --down': 'Show a list of all the active checks in the system including their state. The --up and the --down flags are both optional.',
    'more check info --{checkId}': 'Show details of a specified check.',
    'list logs': 'Show a list of all the log files that are available to be read (compressed and uncompressed).',
    'more log info --{fileName}': 'Show details of a specified log file.'
  };

  // Show a header for the help page that is as wide as the screen
  cli.horizontalLine();
  cli.centered('CLI MANUAL');
  cli.horizontalLine();
  cli.verticalSpace(2);

  // Show each command followed by its explanation in white and yellow respectively
  for (let key in commands) {
    if (commands.hasOwnProperty(key)) {
      const value = commands[key];
      let line = `\x1b[33m${key}\x1b[0m`;
      const padding = 50 - line.length;

      for (let i = 0; i < padding; i++) {
        line += ' ';
      }

      line += value;

      console.log(line);
      cli.verticalSpace();
    }
  }

  cli.verticalSpace();
  cli.horizontalLine();
};

// Exit
cli.responders.exit = () => {
  process.exit(0);
};

// Stats
cli.responders.stats = () => {
  // Compile an object of stats
  const stats = {
    'Load Average': os.loadavg().join(' '),
    'CPU Count': os.cpus().length,
    'Free Memory': os.freemem(),
    'Current Malloced Memory': v8.getHeapStatistics().malloced_memory,
    'Peak Malloced Memory': v8.getHeapStatistics().peak_malloced_memory,
    'Allocated Heap Used (%)': Math.round((v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size) * 100),
    'Available Heap Allocated (%)': Math.round((v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit) * 100),
    'Uptime': `${os.uptime()} Seconds`
  };

  // Create a header for the stats page
  cli.horizontalLine();
  cli.centered('SYSTEM STATISTICS');
  cli.horizontalLine();
  cli.verticalSpace(2);

  // Show each command followed by its explanation in white and yellow respectively
  for (let key in stats) {
    if (stats.hasOwnProperty(key)) {
      const value = stats[key];
      let line = `\x1b[33m${key}:\x1b[0m`;
      const padding = 50 - line.length;

      for (let i = 0; i < padding; i++) {
        line += ' ';
      }

      line += value;

      console.log(line);
      cli.verticalSpace();
    }
  }

  cli.verticalSpace();
  cli.horizontalLine();
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

