// tests/unit/middleware/validateQuery.middleware.test.js
require('../../setup/mockRedis.js');
// resolves to: tests/Upstash/setup/mockRedis.js  ← DOESN'T EXIST
const { validateScraperQuery } = require('../../../../src/middleware/validateQuery.middleware.js');

const makeReqRes = (query = {}) => {
  const req  = { query };
  const res  = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  const next = jest.fn();
  return { req, res, next };
};

describe('validateScraperQuery Middleware', () => {
  it('calls next() when all required params present', () => {
    const middleware = validateScraperQuery(['role', 'location']);
    const { req, res, next } = makeReqRes({ role: 'engineer', location: 'remote' });
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 400 when a required param is missing', () => {
    const middleware = validateScraperQuery(['role', 'location']);
    const { req, res, next } = makeReqRes({ role: 'engineer' });
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 400 when a required param is empty string', () => {
    const middleware = validateScraperQuery(['query']);
    const { req, res, next } = makeReqRes({ query: '   ' });
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('includes missing param names in error message', () => {
    const middleware = validateScraperQuery(['destination', 'checkIn', 'checkOut']);
    const { req, res, next } = makeReqRes({ destination: 'paris' });
    middleware(req, res, next);
    const jsonArg = res.json.mock.calls[0][0];
    expect(jsonArg.error).toContain('checkIn');
    expect(jsonArg.error).toContain('checkOut');
  });

  it('works with single required param', () => {
    const middleware = validateScraperQuery(['query']);
    const { req, res, next } = makeReqRes({ query: 'python' });
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
