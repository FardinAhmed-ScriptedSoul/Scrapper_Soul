const FIFTEEN_MINUTES = 15 * 60 * 1000;

const createDefaultDependencies = () => {
  const config = require('./config/config.js');

  return {
    app: require('./app.js'),
    connectDB: require('./db/db.js'),
    disconnectDB: () => require('mongoose').disconnect(),
    initWorkerEngine: require('./workers/scrapeWorker.js').initWorkerEngine,
    initScheduler: require('./schedulers/cronScheduler.js').initScheduler,
    stopScheduler: require('./schedulers/cronScheduler.js').stopScheduler,
    runMasterPipeline: require('./workers/feedWorker.js').runMasterPipeline,
    queue: require('./queues/scrapeQueue.js'),
    port: config.port,
    intervalMs: FIFTEEN_MINUTES
  };
};

class ApiServer {
  constructor(dependencies = null) {
    this.dependencies = dependencies;
    this.httpServer = null;
    this.startPromise = null;
    this.feedTimer = null;
    this.stopped = false;
    this.workerInitialized = false;
  }

  getDependencies() {
    if (!this.dependencies) {
      this.dependencies = createDefaultDependencies();
    }
    return this.dependencies;
  }

  async start() {
    if (this.stopped) {
      throw new Error('The server has been stopped and cannot be restarted.');
    }
    if (this.httpServer) return this.httpServer;
    if (this.startPromise) return this.startPromise;

    this.startPromise = this.startServices();
    try {
      return await this.startPromise;
    } catch (error) {
      this.startPromise = null;
      throw error;
    }
  }

  async startServices() {
    const dependencies = this.getDependencies();
    await dependencies.connectDB();
    if (!this.workerInitialized && dependencies.initWorkerEngine) {
      dependencies.initWorkerEngine();
      this.workerInitialized = true;
    }
    await dependencies.initScheduler();

    const runPipeline = () => {
      Promise.resolve()
        .then(() => dependencies.runMasterPipeline())
        .catch((error) => console.error('Background feed pipeline failed:', error));
    };

    runPipeline();
    this.feedTimer = setInterval(runPipeline, dependencies.intervalMs || FIFTEEN_MINUTES);

    this.httpServer = await new Promise((resolve, reject) => {
      const server = dependencies.app.listen(dependencies.port, () => resolve(server));
      server.once('error', reject);
    });

    return this.httpServer;
  }

  async stop() {
    if (this.stopped) return;
    this.stopped = true;
    if (this.feedTimer) {
      clearInterval(this.feedTimer);
      this.feedTimer = null;
    }

    const dependencies = this.dependencies;
    if (!dependencies) return;

    const errors = [];
    if (this.httpServer) {
      try {
        await new Promise((resolve, reject) => {
          this.httpServer.close((error) => error ? reject(error) : resolve());
        });
        this.httpServer = null;
      } catch (error) {
        errors.push(error);
      }
    }

    for (const cleanup of [
      dependencies.stopScheduler,
      dependencies.queue && (() => dependencies.queue.close()),
      dependencies.disconnectDB
    ]) {
      if (!cleanup) continue;
      try {
        await cleanup();
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      const error = new Error(`Server shutdown had ${errors.length} cleanup error(s).`);
      error.causes = errors;
      throw error;
    }
  }
}

const server = new ApiServer();

module.exports = server;
module.exports.ApiServer = ApiServer;
