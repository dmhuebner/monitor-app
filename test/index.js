/*===================
 Test Runner
===================*/

const helpers = require('../lib/helpers');
const assert = require('assert');

// Application logic container for the test runner
const _app = {};

// Container for tests
_app.tests = {
  unit: {}
};

/**************************************************************************************
* ADD TESTS HERE
***************************************************************************************/

// Example test
_app.tests.unit['Example test'] = (done) => {
  assert.equal(true, true);
  done();
};

/**************************************************************************************
* END OF TESTS
**************************************************************************************/

// Count all the tests
_app.countTests =() => {
  let counter = 0;

  // Loop through all tests and count them up
  for (let key in _app.tests) {
    if (_app.tests.hasOwnProperty(key)) {
      const subTests = _app.tests[key];

      for (let testName in subTests) {
        if (subTests.hasOwnProperty(testName)) {
          counter++
        }
      }
    }
  }

  return counter;
};

// Run all the tests and collect errors and successes
_app.runTests = () => {
  const errors = [];
  let successes = 0;
  const numberOfTests = _app.countTests();
  let counter = 0;

  console.log(helpers.setConsoleColor('lightblue', 'Running Tests...'));

  for (let key in _app.tests) {
    if (_app.tests.hasOwnProperty(key)) {
      const subTests = _app.tests[key];

      for (let testName in subTests) {
        if (subTests.hasOwnProperty(testName)) {
          (() => {
            const currentTestName = testName
            const testValue = subTests[testName];
            // Call the test
            try {
              testValue(() => {
                // If it calls back without throwing then it succeeded. Log it in green
                console.log(helpers.setConsoleColor('green', currentTestName));
                counter++
                successes++

                if (counter === numberOfTests) {
                  _app.produceTestReport(numberOfTests, successes, errors);
                }
              });
            } catch(error) {
              // If it throws the test failed. Capture the error thrown and log in red
              errors.push({
                name: currentTestName,
                error: error
              });

              console.log(helpers.setConsoleColor('red', currentTestName));
              counter++

              if (counter === numberOfTests) {
                _app.produceTestReport(numberOfTests, successes, errors);
              }
            }
          })();
        }
      }
    }
  }
};

// Produce a test result report
_app.produceTestReport = (numberOfTests, successes, errors) => {
  console.log('');
  console.log('==================== BEGIN TEST REPORT ====================');
  console.log('');
  console.log(`${helpers.setConsoleColor('lightblue', 'Tests Run: ')} ${numberOfTests}`);
  console.log(`${helpers.setConsoleColor('green', 'Successes: ')} ${successes}`);
  if (errors.length) {
    console.log(`${helpers.setConsoleColor('red', 'Errors:    ')} ${errors.length}`);
  }
  console.log('');

  // If there are errors, print them in detail
  if (errors.length) {
    console.log('-------------------- BEGIN ERROR DETAILS --------------------');

    errors.forEach((testError) => {
      console.log(helpers.setConsoleColor('red', testError.name));
      console.log(testError.error);
    });

    console.log('-------------------- END ERROR DETAILS --------------------');
  }

  console.log('');
  console.log('==================== END TEST REPORT ====================');
};

// Run the tests
_app.runTests();