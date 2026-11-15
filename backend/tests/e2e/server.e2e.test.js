jest.mock('../../src/queues/scrapeQueue.js', () => ({
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined)
}));

const request = require('supertest');
const app = require('../../src/app.js');
const { ApiServer } = require('../../src/server.js');

describe('HTTP server end-to-end', () => {
  let server;
  let listenSpy;

  afterEach(async () => {
    if (server) {
      await server.stop();
      server = null;
    }
    if (listenSpy) {
      listenSpy.mockRestore();
      listenSpy = null;
    }
  });

  it('serves the health route through one idempotent server instance', async () => {
    const dependencies = {
      app,
      connectDB: jest.fn().mockResolvedValue(undefined),
      disconnectDB: jest.fn().mockResolvedValue(undefined),
      initWorkerEngine: jest.fn(),
      initScheduler: jest.fn().mockResolvedValue(undefined),
      stopScheduler: jest.fn(),
      runMasterPipeline: jest.fn().mockResolvedValue(undefined),
      queue: { close: jest.fn().mockResolvedValue(undefined) },
      port: 0,
      intervalMs: 60_000
    };
    listenSpy = jest.spyOn(app, 'listen');
    server = new ApiServer(dependencies);

    const [first, second] = await Promise.all([server.start(), server.start()]);
    const response = await request(first).get('/health');

    expect(first).toBe(second);
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('online');
    expect(listenSpy).toHaveBeenCalledTimes(1);
  });
});
