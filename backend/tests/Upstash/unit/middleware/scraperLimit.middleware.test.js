// tests/Upstash/unit/middleware/scraperLimit.middleware.test.js
require('../../setup/mockRedis.js');

const scraperLimiter = require('../../../../src/middleware/scraperLimit.middleware.js');

describe('scraperLimiter middleware', () => {
  it('should be a function (express middleware)', () => {
    expect(typeof scraperLimiter).toBe('function');
  });

  it('should have arity of 3 (req, res, next)', () => {
    expect(scraperLimiter.length).toBe(3);
  });

  // Replace the failing test in scraperLimit.middleware.test.js
it('should call next() when rate limit not exceeded', async () => {
  const req = {
    ip: '127.0.0.1',
    headers: {},
    method: 'GET',
    url: '/scrape/amazon',
    app: { get: jest.fn().mockReturnValue(false) },
    connection: { remoteAddress: '127.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' }
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    setHeader: jest.fn(),
    getHeader: jest.fn().mockReturnValue(null),
    removeHeader: jest.fn(),
    on: jest.fn()
  };
  const next = jest.fn();

  await new Promise((resolve) => {
    const wrappedNext = () => { next(); resolve(); };
    scraperLimiter(req, res, wrappedNext);
    setTimeout(resolve, 100); // fallback resolve
  });

  expect(next).toHaveBeenCalled();
});
});