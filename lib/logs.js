/*
* Library for storing and rotating logs
* */

const fs = require('fs'),
      path = require('path'),
      zlib = require('zlib');

// Container for the module
const lib = {};

// Base directory for logs folder
lib.baseDir = path.join(__dirname, '/../.logs/');

// Append a string to a file. Create the file if it does not exist
lib.append = (fileName, stringToAppend, callback) => {
  // Open the file for appending
  fs.open(`${lib.baseDir + fileName}.log`, 'a', (error, fileDescriptor) => {
    if (!error && fileDescriptor) {
      // Append to the file and close it
      fs.appendFile(fileDescriptor, stringToAppend + '\n', (error) => {
        if (!error) {
          // Close the file
          fs.close(fileDescriptor, (error) => {
            if (!error) {
              callback(false);
            } else {
              callback('Error closing the file that was being appended to')
            }
          });
        } else {
          callback('Error appending to file');
        }
      });
    } else {
      callback('Could not open the file for appending');
    }
  });
};

// List all the logs and optionally include the compressed logs
lib.list = (includeCompressedLogs, callback) => {
  fs.readdir(lib.baseDir, (error, data) => {
    if (!error && data && data.length > 0) {
      let trimmedFileNames = [];
      data.forEach((fileName) => {

        // Add the .log files
        if (fileName.indexOf('.log') > -1) {
          trimmedFileNames.push(fileName.replace('.log', ''));
        }

        // Add the .gz zipped files
        if (fileName.indexOf('.gz.b64') > -1 && includeCompressedLogs) {
          trimmedFileNames.push(fileName.replace('.gz.b64', ''));
        }
      });

      callback(false, trimmedFileNames);
    } else {
      callback(error, data);
    }
  });
};

// Compress the contents of one .log file into a .gz.b64 file within the same directory
lib.compress = (logId, newFileId, callback) => {
  const sourceFile = `${logId}.log`;
  const destinationFile = `${newFileId}.gz.b64`;

  // Read the source file
  fs.readFile(lib.baseDir + sourceFile, 'utf8', (error, inputString) => {
    if (!error && inputString) {
      // Compress the data using gzip
      zlib.gzip(inputString, (error, buffer) => {
        if (!error && buffer) {
          // Send the compressed data to destinationFile
          fs.open(lib.baseDir + destinationFile, 'wx', (error, fileDescriptor) => {
            if (!error && fileDescriptor) {
              fs.writeFile(fileDescriptor, buffer.toString('base64'), (error) => {
                if (!error) {
                  // Close the destination file
                  fs.close(fileDescriptor, (error) => {
                    if (!error) {
                      callback(false);
                    } else {
                      callback(error);
                    }
                  });
                } else {
                  callback(error);
                }
              });
            } else {
              callback(error);
            }
          });
        } else {
          callback(error);
        }
      });
    } else {
      callback(error);
    }
  });
};

// Decompress the contents of a .gz.b64 file into a string variable
lib.decompress = (fileId, callback) => {
  const fileName = `${fileId}.gz.b64`;
  fs.readFile(lib.baseDir + fileName, 'utf8', (error, string) => {
    if (!error && string) {
      // Decompress the data
      const inputBuffer = Buffer.from(string, 'base64');
      zlib.unzip(inputBuffer, (error, outputBuffer) => {
        if (!error && outputBuffer) {
          // callback string
          const str = outputBuffer.toString();
          callback(false, str);
        } else {
          callback(error)
        }
      });
    } else {
      callback(error);
    }
  });
};

// Truncate a log file
lib.truncate = (logId, callback) => {
  fs.truncate(lib.baseDir + logId + '.log', 0, (error) => {
    if (!error) {
      callback(false);
    } else {
      callback('error in lib.truncate', error);
    }
  });
};

module.exports = lib;