// tests/Upstash/unit/middleware/activity.middleware.test.js
require("../../setup/mockRedis.js");

const { trackActivity } = require('../../../../src/middleware/activity.middleware.js');

describe('trackActivity middleware', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Suppress clean terminal errors from printing to your clean test output streams
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should return a middleware function closure', () => {
    const middleware = trackActivity('test_action');
    expect(typeof middleware).toBe('function');
  });

  it('should call next() and continue standard route pipeline processing execution', () => {
    const middleware = trackActivity('scraping_operation');
    const req = {
      user: { id: 'user123', email: 'test@test.com' },
      method: 'GET',
      originalUrl: '/api/v1/scrape/amazon',
      ip: '127.0.0.1'
    };
    const res = {};
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should fallback elegantly and not throw when user profile is undefined', () => {
    const middleware = trackActivity('scraping_operation');
    const req = { originalUrl: '/api/test', ip: '127.0.0.1' };
    const res = {};
    const next = jest.fn();

    expect(() => middleware(req, res, next)).not.toThrow();
    expect(next).toHaveBeenCalled();
  });

  // 🎯 Target: Catch Block Coverage (Lines 19-21)
  it('should enter catch block and call next() cleanly if telemetry tracking breaks internally', () => {
    const middleware = trackActivity('fault_test');

    // Pass an object that throws an error whenever code attempts to read originalUrl properties
    const malformedReq = {
      get user() {
        throw new Error('Simulated telemetry extraction failure');
      }
    };
    const res = {};
    const next = jest.fn();

    middleware(malformedReq, res, next);

    // Verifies lines 19-21 run completely:
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "⚠️ Activity tracking anomaly recorded:",
      "Simulated telemetry extraction failure"
    );
    expect(next).toHaveBeenCalled();
  });
});
