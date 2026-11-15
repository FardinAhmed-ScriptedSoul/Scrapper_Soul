const mongoose = require('mongoose');
const config = require('../config/config.js'); // ✅ FIXED: Import the configuration object directly without destructuring

const connectDB = async () => {
  try {
    console.log('🔄 Attaching database sockets to MongoDB Cluster...');
    
    // ✅ FIXED: Read from config.db.uri to seamlessly match your config.js structure
    const dbUri = config && config.db && config.db.uri ? config.db.uri : null;

    if (!dbUri) {
        throw new Error("Database connection URI string is undefined in config properties.");
    }

    const connectionInstance = await mongoose.connect(dbUri);
    
    console.log(`✅ MongoDB Connection Secured! Host Cluster: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error(`❌ Database Connection Interrupted: ${error.message}`);
    throw error;
  }
};

module.exports = connectDB;