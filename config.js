const secrets = require('./secrets');
/*
* Create and export configuration variables
*
*/

// Container for all environments
const environments = {};

// test (default) environment
environments.test = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'test',
  hashingSecret: secrets.env.test.hashingSecret,
  maxChecks: 5,
  twilio: secrets.env.test.twilio,
  templateGlobals: {
    appName: 'Uptime Checker',
    companyName: 'Not A Real Company, Inc.',
    yearCreated: '2018',
    baseUrl: 'http://localhost:3000/'
  }
};

// Production environment
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashingSecret: secrets.env.production.hashingSecret,
  maxChecks: 5,
  twilio: secrets.env.production.twilio,
  templateGlobals: {
    appName: 'Uptime Checker',
    companyName: 'Not A Real Company, Inc.',
    yearCreated: '2018',
    baseUrl: 'http://localhost:5000/'
  }
};

// Determine which environment was passed as command-line argument
const currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check that current environment is valid, otherwise default to test
const environmentToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.test;

// Export module
module.exports = environmentToExport;