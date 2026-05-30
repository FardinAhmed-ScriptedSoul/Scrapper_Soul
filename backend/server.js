const app = require('./src/app.js'); 
const connectDB = require('./src/db/db.js'); 
const { config } = require('./src/config/config.js');

(async () => {
  try {
    
    await connectDB();

    
    const server = app.listen(config.port, () => {
      console.log(`🚀 Engine active! Server running at: http://localhost:${config.port}`);
    });

    
    server.on('error', (err) => {
      console.error('❌ Server failed to start:', err);
    });

  } catch (error) {
    console.error('💥 Bootstrapping failed critical error:', error);
    process.exit(1);
  }
})();