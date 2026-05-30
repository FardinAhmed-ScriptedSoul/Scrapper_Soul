const dotenv = require('dotenv');
const path = require('path');

// Ensure we pick up the local .env file inside the backend workspace
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const _config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  fallbackPort: 4000,
  dbUri: process.env.MONGODB_URI,
  env: process.env.NODE_ENV || 'development'
};

// Check if essential parameters are missing before the engine fires up
if (!_config.dbUri) {
  console.error('❌ CRITICAL ERROR: MONGODB_URI is not defined inside your .env configuration file.');
  process.exit(1);
}

const config = Object.freeze(_config);
module.exports = { config };