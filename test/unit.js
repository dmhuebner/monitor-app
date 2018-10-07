const assert = require('assert'),
      helpers = require('../lib/helpers'),
      logs = require('./../lib/logs');

// container for unit tests
const unit = {};

/**************************************************************************************
 * ADD TESTS HERE
 ***************************************************************************************/

unit['logs.list should callback a falsy error and an array of log names'] = (done) => {
  logs.list(true, (error, logFileNames) => {
    assert.equal(error, false);
    assert.ok(logFileNames instanceof Array);
    assert.ok(logFileNames.length > 1);
    done();
  });
};

unit['should not throw if the log id does not exist. It should callback an error instead'] = (done) => {
  assert.doesNotThrow(() => {
    logs.truncate('bad ID', (error) => {
      assert.ok(error);
      done();
    });
  }, TypeError);
};

/**************************************************************************************
 * END OF TESTS
 **************************************************************************************/

module.exports = unit;