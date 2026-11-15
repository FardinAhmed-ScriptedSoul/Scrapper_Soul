// tests/setup/jest.teardown.js
// tests/setup/jest.teardown.js
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  if (global.__MONGO_SERVER__) {
    await global.__MONGO_SERVER__.stop();
  }
  // Clean up temp file
  const tmpFile = path.join(__dirname, 'mongo-uri.txt');
  if (fs.existsSync(tmpFile)) {
    fs.unlinkSync(tmpFile);
  }
};