
// tests/setup/jest.setup.js
// tests/setup/jest.setup.js
process.env.MONGOMS_DOWNLOAD_DIR = 'D:/mongodb-binaries';
process.env.MONGOMS_VERSION = '5.0.14';

const { MongoMemoryServer } = require('mongodb-memory-server');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Write URI to a temp file so worker processes can read it
  const tmpFile = path.join(__dirname, 'mongo-uri.txt');
  fs.writeFileSync(tmpFile, uri);

  process.env.MONGODB_URI          = uri;
  process.env.JWT_SECRET           = 'test_jwt_secret_key_scrapper_soul';
  process.env.JWT_EXPIRES_IN       = '7d';
  process.env.NODE_ENV             = 'test';
  process.env.REDIS_URL            = '';
  process.env.EMAIL_USER           = 'test@test.com';
  process.env.GOOGLE_CLIENT_ID     = 'test_client_id';
  process.env.GOOGLE_CLIENT_SECRET = 'test_client_secret';
  process.env.REFRESH_TOKEN        = 'test_refresh_token';

  global.__MONGO_SERVER__ = mongoServer;
};