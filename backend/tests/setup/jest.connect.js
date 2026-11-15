// tests/setup/jest.connect.js
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

beforeAll(async () => {
  const tmpFile = path.join(__dirname, 'mongo-uri.txt');
  const uri = fs.readFileSync(tmpFile, 'utf-8').trim();

  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET  = 'test_jwt_secret_key_scrapper_soul';
  process.env.JWT_EXPIRES_IN = '7d';
  process.env.NODE_ENV    = 'test';
  process.env.REDIS_URL   = '';
  process.env.EMAIL_USER  = 'test@test.com';
  process.env.GOOGLE_CLIENT_ID = 'test_client_id';
  process.env.GOOGLE_CLIENT_SECRET = 'test_client_secret';
  process.env.REFRESH_TOKEN = 'test_refresh_token';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }
});

afterAll(async () => {
  await mongoose.disconnect();
});