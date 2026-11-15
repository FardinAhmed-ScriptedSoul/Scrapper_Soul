const { EventEmitter } = require('events');
const { ApiServer } = require('../../src/server.js');

const createDependencies = () => {
  const listener = new EventEmitter();
  listener.close = jest.fn((callback) => callback());

  const dependencies = {
    app: {
      listen: jest.fn((port, callback) => {
        setImmediate(callback);
        return listener;
      })
    },
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

  return { dependencies, listener };
};

describe('ApiServer lifecycle', () => {
  it('starts the listener and background services only once for concurrent starts', async () => {
    const { dependencies, listener } = createDependencies();
    const server = new ApiServer(dependencies);

    const [first, second] = await Promise.all([server.start(), server.start()]);

    expect(first).toBe(listener);
    expect(second).toBe(listener);
    expect(dependencies.connectDB).toHaveBeenCalledTimes(1);
    expect(dependencies.initWorkerEngine).toHaveBeenCalledTimes(1);
    expect(dependencies.initScheduler).toHaveBeenCalledTimes(1);
    expect(dependencies.app.listen).toHaveBeenCalledTimes(1);

    await server.stop();
    expect(listener.close).toHaveBeenCalledTimes(1);
    expect(dependencies.queue.close).toHaveBeenCalledTimes(1);
    expect(dependencies.disconnectDB).toHaveBeenCalledTimes(1);
  });

  it('does not open a listener when database startup fails', async () => {
    const { dependencies } = createDependencies();
    dependencies.connectDB.mockRejectedValue(new Error('database unavailable'));
    const server = new ApiServer(dependencies);

    await expect(server.start()).rejects.toThrow('database unavailable');
    expect(dependencies.app.listen).not.toHaveBeenCalled();
  });
});
