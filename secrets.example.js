/*** This file should be replaced with a 'secrets.js' file that has actual API credentials ***/

const secrets = {
  env: {
    test: {
      twilio: {
        accountSid: 'TWILIO_TEST_ACCOUNT_SID_GOES_HERE',
        authToken: 'TWILIO_TEST_AUTH_TOKEN_GOES_HERE',
        fromPhone: '+15553339999'
      },
      hashingSecret: 'thisIsASecret'
    },
    production: {
      twilio: {
        accountSid: 'TWILIO_PROD_ACCOUNT_SID_GOES_HERE',
        authToken: 'TWILIO_PROD_AUTH_TOKEN_GOES_HERE',
        fromPhone: '+15553339999'
      },
      hashingSecret: 'thisIsAlsoASecret'
    }
  }
};

module.exports = secrets;