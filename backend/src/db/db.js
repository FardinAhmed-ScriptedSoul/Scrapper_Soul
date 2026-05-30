const mongoose = require('mongoose');
const { config } = require('../config/config.js');

const connectDB = async () => {
  try {
    console.log('🔄 Attaching database sockets to MongoDB Cluster...');
    
    const connectionInstance = await mongoose.connect(config.dbUri);
    
    console.log(`✅ MongoDB Connection Secured! Host Cluster: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error(`❌ Database Connection Interrupted: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;