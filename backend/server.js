const server = require('./src/server.js');

if (require.main === module) {
  let shuttingDown = false;

  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await server.stop();
    } catch (error) {
      console.error('Server shutdown failed:', error);
      process.exitCode = 1;
    }
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  server.start().catch(async (error) => {
    console.error('Server startup failed:', error);
    try {
      await server.stop();
    } catch (shutdownError) {
      console.error('Server cleanup after startup failure failed:', shutdownError);
    }
    process.exitCode = 1;
  });
}

module.exports = server;