// tests/unit/models/user.model.test.js
require('../../setup/mockRedis.js');
const mongoose = require('mongoose');
const User = require('../../../../src/models/user.model.js');

describe('User Model', () => {
  afterEach(async () => {
    await User.deleteMany({});
  });

  // ── Schema validation ────────────────────────────────────────────────────
  it('creates a valid user with required fields', async () => {
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    });
    expect(user._id).toBeDefined();
    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
    expect(user.tokenVersion).toBe(0);
  });

  it('lowercases username and email automatically', async () => {
    const user = await User.create({
      username: 'TestUser',
      email: 'TEST@EXAMPLE.COM',
      password: 'password123'
    });
    expect(user.username).toBe('testuser');
    expect(user.email).toBe('test@example.com');
  });

  it('accepts the legacy userName field when creating a user', async () => {
    const user = await User.create({
      userName: 'legacyuser',
      email: 'legacy@example.com',
      password: 'password123'
    });

    expect(user.username).toBe('legacyuser');
  });

  it('rejects duplicate email', async () => {
    await User.create({ username: 'user1', email: 'dup@test.com', password: 'pass123' });
    await expect(
      User.create({ username: 'user2', email: 'dup@test.com', password: 'pass123' })
    ).rejects.toThrow();
  });

  it('rejects duplicate username', async () => {
    await User.create({ username: 'sameuser', email: 'a@test.com', password: 'pass123' });
    await expect(
      User.create({ username: 'sameuser', email: 'b@test.com', password: 'pass123' })
    ).rejects.toThrow();
  });

  it('rejects username shorter than 3 chars', async () => {
    await expect(
      User.create({ username: 'ab', email: 'short@test.com', password: 'pass123' })
    ).rejects.toThrow();
  });

  it('rejects missing email', async () => {
    await expect(
      User.create({ username: 'nomail', password: 'pass123' })
    ).rejects.toThrow();
  });

  it('rejects invalid email format', async () => {
    await expect(
      User.create({ username: 'badmail', email: 'notanemail', password: 'pass123' })
    ).rejects.toThrow();
  });

  it('rejects password shorter than 6 chars', async () => {
    await expect(
      User.create({ username: 'shortpass', email: 'sp@test.com', password: '123' })
    ).rejects.toThrow();
  });

  // ── Password hashing ─────────────────────────────────────────────────────
  it('hashes password before saving', async () => {
    const user = await User.create({
      username: 'hashtest',
      email: 'hash@test.com',
      password: 'plainpassword'
    });
    const fetched = await User.findById(user._id).select('+password');
    expect(fetched.password).not.toBe('plainpassword');
    expect(fetched.password).toMatch(/^\$2[ab]\$/); // bcrypt signature
  });

  it('does not re-hash password if not modified', async () => {
    const user = await User.create({
      username: 'rehashtest',
      email: 'rehash@test.com',
      password: 'plainpassword'
    });
    const fetched = await User.findById(user._id).select('+password');
    const originalHash = fetched.password;

    fetched.username = 'rehashtest2';
    await fetched.save();

    const refetched = await User.findById(user._id).select('+password');
    expect(refetched.password).toBe(originalHash);
  });

  // ── comparePassword ──────────────────────────────────────────────────────
  it('comparePassword returns true for correct password', async () => {
    const user = await User.create({
      username: 'comptest',
      email: 'comp@test.com',
      password: 'mypassword'
    });
    const fetched = await User.findById(user._id).select('+password');
    const result = await fetched.comparePassword('mypassword');
    expect(result).toBe(true);
  });

  it('comparePassword returns false for wrong password', async () => {
    const user = await User.create({
      username: 'wrongpass',
      email: 'wrong@test.com',
      password: 'correctpassword'
    });
    const fetched = await User.findById(user._id).select('+password');
    const result = await fetched.comparePassword('wrongpassword');
    expect(result).toBe(false);
  });

  // ── generateAuthToken ────────────────────────────────────────────────────
  it('generateAuthToken returns a JWT string', async () => {
    const user = await User.create({
      username: 'tokentest',
      email: 'token@test.com',
      password: 'password123'
    });
    const token = user.generateAuthToken();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  // ── select: false guards ─────────────────────────────────────────────────
  it('does not expose password in default query', async () => {
    const user = await User.create({
      username: 'noleak',
      email: 'noleak@test.com',
      password: 'password123'
    });
    const fetched = await User.findById(user._id);
    expect(fetched.password).toBeUndefined();
    expect(fetched.tokenVersion).toBeUndefined();
  });

  it('exposes tokenVersion when explicitly selected', async () => {
    const user = await User.create({
      username: 'tvtest',
      email: 'tv@test.com',
      password: 'password123'
    });
    const fetched = await User.findById(user._id).select('+tokenVersion');
    expect(fetched.tokenVersion).toBeDefined();
    expect(fetched.tokenVersion).toBe(0);
  });

  // ── resetPassword fields ─────────────────────────────────────────────────
  it('stores resetPasswordToken and resetPasswordExpiry', async () => {
    const user = await User.create({
      username: 'resettest',
      email: 'reset@test.com',
      password: 'password123'
    });
    user.resetPasswordToken  = 'abc123hash';
    user.resetPasswordExpiry = new Date(Date.now() + 3600000);
    await user.save();

    const fetched = await User.findById(user._id);
    expect(fetched.resetPasswordToken).toBe('abc123hash');
    expect(fetched.resetPasswordExpiry).toBeInstanceOf(Date);
  });
});