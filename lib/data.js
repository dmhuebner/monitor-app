/*
* Library for storing and editing data
*
*/

const fs = require('fs'),
      path = require('path'),
      helpers = require('./helpers');

// Container
const lib = {};

// Base directory of data folder

lib.baseDir = path.join(__dirname, '/../.data/');

lib.create = (dir, file, data, callback) => {

  // Open the file for writing
  fs.open(`${lib.baseDir + dir}/${file}.json`, 'wx', (error, fileDescriptor) => {
    if (!error && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data);

      // Write to file and close it
      fs.writeFile(fileDescriptor, stringData, (error) => {
        if (!error) {
          fs.close(fileDescriptor, (error) => {
            if (!error) {
              // calls back false meaning the presence of an error is false
              callback(false);
            } else {
              callback('Error closing new file');
            }
          });
        } else {
          callback('Error writing to new file');
        }
      });
    } else {
      callback('Error: Could not create new file, it may already exist');
    }
  });
};

// Read data from a file
lib.read = (dir, file, callback) => {
  fs.readFile(`${lib.baseDir + dir}/${file}.json`, 'utf8', (error, data) => {
    if (!error && data) {
      const parsedData = helpers.parseJsonToObject(data);
      callback(false, parsedData);
    } else {
      callback(error, data);
    }
  });
};

// Update data inside a file
lib.update = (dir, file, data, callback) => {
  // Open the file for writing
  fs.open(`${lib.baseDir + dir}/${file}.json`, 'r+', (error, fileDescriptor) => {
    if (!error && fileDescriptor) {
      // Convert data to string
      const stringData = JSON.stringify(data);

      // Truncate the file
      fs.truncate(fileDescriptor, (error) => {
        if (!error) {
          // Write to the file and close it
          fs.writeFile(fileDescriptor, stringData, (error) => {
            if (!error) {
              fs.close(fileDescriptor, (error) => {
                if (!error) {
                  callback(false);
                } else {
                  callback('Error closing the file');
                }
              });
            } else {
              callback('Error writing to existing file');
            }
          });
        } else {
          callback('Error truncating file');
        }
      });
    } else {
      callback('Could not open the file for updating, it my not exist yet');
    }
  });
};

// Delete a file
lib.delete = (dir, file, callback) => {
  // Unlink the file
  fs.unlink(`${lib.baseDir + dir}/${file}.json`, (error) => {
    if (!error) {
      callback(false);
    } else {
      callback('Error deleting file');
    }
  })
};

module.exports = lib;