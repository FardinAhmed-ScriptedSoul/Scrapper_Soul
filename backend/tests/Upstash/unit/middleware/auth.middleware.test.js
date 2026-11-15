// tests/unit/middleware/auth.middleware.test.js
require('../../setup/mockRedis.js');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User    = require('../../../../src/models/user.model.js');
const protect = require('../../../../src/middleware/auth.middleware.js');

const makeReqRes = (token = null, bearer = false) => {
  const req = {
    cookies: token && !bearer ? { token } : {},
    headers: bearer ? { authorization: `Bearer ${token}` } : {},
    user: null,
    token: null
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  const next = jest.fn();
  return { req, res, next };
};

describe('Auth Middleware', () => {
  let user, validToken;

  beforeEach(async () => {
    await User.deleteMany({});
    user = await User.create({
      username: 'middlewareuser',
      email: 'mw@test.com',
      password: 'password123'
    });
    validToken = user.generateAuthToken();
  });

  it('calls next() with valid cookie token', async () => {
    const { req, res, next } = makeReqRes(validToken);
    await protect(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.email).toBe('mw@test.com');
  });

  it('calls next() with valid Bearer token', async () => {
    const { req, res, next } = makeReqRes(validToken, true);
    await protect(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 when no token provided', async () => {
    const { req, res, next } = makeReqRes();
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for expired token', async () => {
    const expiredToken = jwt.sign(
      { id: user._id, tokenVersion: 0 },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const { req, res, next } = makeReqRes(expiredToken);
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 for tampered token', async () => {
    const { req, res, next } = makeReqRes(validToken + 'tampered');
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 for wrong tokenVersion', async () => {
    // Increment tokenVersion in DB — token now stale
    await User.findByIdAndUpdate(user._id, { $inc: { tokenVersion: 1 } });
    const { req, res, next } = makeReqRes(validToken);
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 for non-existent user', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const ghostToken = jwt.sign({ id: fakeId, tokenVersion: 0 }, process.env.JWT_SECRET);
    const { req, res, next } = makeReqRes(ghostToken);
    await protect(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});