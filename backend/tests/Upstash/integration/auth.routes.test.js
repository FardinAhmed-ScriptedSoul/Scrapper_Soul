// // tests/integration/auth.routes.test.js
// require('../setup/mockRedis.js');

// jest.mock('../../../src/queues/scrapeQueue.js', () => ({
//   add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
//   process: jest.fn(),
//   on: jest.fn(),
//   getJob: jest.fn().mockResolvedValue(null),
//   getJobs: jest.fn().mockResolvedValue([]),
//   count: jest.fn().mockResolvedValue(0),
//   empty: jest.fn().mockResolvedValue(undefined),
//   close: jest.fn().mockResolvedValue(undefined)
// }));
// // Mail must not fire real emails
// jest.mock('../../../src/services/mail.services.js', () => ({
//   sendEmail: jest.fn().mockResolvedValue(true),
//   transporter: { verify: jest.fn() }
// }));

// const request  = require('supertest');
// const app      = require('../../../src/app.js');
// const User     = require('../../../src/models/user.model.js');

// describe('Auth Routes Integration', () => {
//   afterEach(async () => {
//     await User.deleteMany({});
//     jest.clearAllMocks();
//   });

//   // ── /register-request ────────────────────────────────────────────────────
//   describe('POST /api/v1/auth/register-request', () => {
//     it('returns 200 and sends OTP for valid input', async () => {
//       const res = await request(app)
//         .post('/api/v1/auth/register-request')
//         .send({ userName: 'newuser', email: 'new@test.com', password: 'password123' });
//       expect([200, 201]).toContain(res.status);
//     });

//     it('returns 400 for missing email', async () => {
//       const res = await request(app)
//         .post('/api/v1/auth/register-request')
//         .send({ username: 'nomail', password: 'password123' });
//       expect(res.status).toBe(400);
//     });

//     it('returns 400 for missing password', async () => {
//       const res = await request(app)
//         .post('/api/v1/auth/register-request')
//         .send({ username: 'nopass', email: 'nopass@test.com' });
//       expect(res.status).toBe(400);
//     });

//     it('returns 409 or 400 if email already registered', async () => {
//       await User.create({ username: 'existing', email: 'exist@test.com', password: 'password123' });
//       const res = await request(app)
//         .post('/api/v1/auth/register-request')
//         .send({ username: 'newname', email: 'exist@test.com', password: 'password123' });
//       expect([400, 409]).toContain(res.status);
//     });
//   });

//   // ── /login ───────────────────────────────────────────────────────────────
//   describe('POST /api/v1/auth/login', () => {
//     beforeEach(async () => {
//       await User.create({ username: 'loginuser', email: 'login@test.com', password: 'password123' });
//     });

//     it('returns 200 for valid credentials', async () => {
//       const res = await request(app)
//         .post('/api/v1/auth/login')
//         .send({ email: 'login@test.com', password: 'password123' });
//       expect([200, 201]).toContain(res.status);
//     });

//     it('returns 401 for wrong password', async () => {
//       const res = await request(app)
//         .post('/api/v1/auth/login')
//         .send({ email: 'login@test.com', password: 'wrongpassword' });
//       expect(res.status).toBe(401);
//     });

//     it('returns 404 or 401 for non-existent email', async () => {
//       const res = await request(app)
//         .post('/api/v1/auth/login')
//         .send({ email: 'ghost@test.com', password: 'password123' });
//       expect([401, 404]).toContain(res.status);
//     });

//     it('returns 400 for missing email field', async () => {
//       const res = await request(app)
//         .post('/api/v1/auth/login')
//         .send({ password: 'password123' });
//       expect(res.status).toBe(400);
//     });
//   });

//   // ── /get-me (protected) ──────────────────────────────────────────────────
//   describe('GET /api/v1/auth/get-me', () => {
//     it('returns 401 without token', async () => {
//       const res = await request(app).get('/api/v1/auth/get-me');
//       expect(res.status).toBe(401);
//     });

//     it('returns 200 with valid token', async () => {
//       const user = await User.create({
//         username: 'meuser',
//         email: 'me@test.com',
//         password: 'password123'
//       });
//       const token = user.generateAuthToken();
//       const res = await request(app)
//         .get('/api/v1/auth/get-me')
//         .set('Cookie', `token=${token}`);
//       expect(res.status).toBe(200);
//     });
//   });

//   // ── /logout ──────────────────────────────────────────────────────────────
//   describe('POST /api/v1/auth/logout', () => {
//     it('returns 401 without token', async () => {
//       const res = await request(app).post('/api/v1/auth/logout');
//       expect(res.status).toBe(401);
//     });

//     it('returns 200 with valid token', async () => {
//       const user = await User.create({
//         username: 'logoutuser',
//         email: 'logout@test.com',
//         password: 'password123'
//       });
//       const token = user.generateAuthToken();
//       const res = await request(app)
//         .post('/api/v1/auth/logout')
//         .set('Cookie', `token=${token}`);
//       expect(res.status).toBe(200);
//     });
//   });

//   // ── /forgot-password ─────────────────────────────────────────────────────
//   describe('POST /api/v1/auth/forgot-password', () => {
//     it('returns 200 even for non-existent email (security: no enumeration)', async () => {
//       const res = await request(app)
//         .post('/api/v1/auth/forgot-password')
//         .send({ email: 'ghost@test.com' });
//       expect([200, 404]).toContain(res.status);
//     });

//     it('returns 200 for valid registered email', async () => {
//       await User.create({ username: 'forgotuser', email: 'forgot@test.com', password: 'password123' });
//       const res = await request(app)
//         .post('/api/v1/auth/forgot-password')
//         .send({ email: 'forgot@test.com' });
//       expect([200, 201]).toContain(res.status);
//     });
//   });

//   // ── /health ──────────────────────────────────────────────────────────────
//   describe('GET /health', () => {
//     it('returns 200 with status online', async () => {
//       const res = await request(app).get('/health');
//       expect(res.status).toBe(200);
//       expect(res.body.status).toBe('online');
//     });
//   });
// });






// tests/integration/auth.routes.test.js
require('../setup/mockRedis.js');

// ── 1. INFRASTRUCTURE & BACKEND CORE MOCKS ───────────────────────────────────
jest.mock('../../../src/queues/scrapeQueue.js', () => ({
  add: jest.fn().mockResolvedValue({ id: 'mock-job-id' }),
  process: jest.fn(),
  on: jest.fn(),
  getJob: jest.fn().mockResolvedValue(null),
  getJobs: jest.fn().mockResolvedValue([]),
  count: jest.fn().mockResolvedValue(0),
  empty: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../../../src/services/mail.services.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  transporter: { verify: jest.fn() }
}));

// Mock Redis configuration module to swap state cleanly based on test criteria
const mockRedisClient = {
  isOpen: true,
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
};
jest.mock('../../../src/config/redis.config.js', () => mockRedisClient);

// ── 2. IMPORTS & DEPENDENCIES ────────────────────────────────────────────────
const request = require('supertest');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const app = require('../../../src/app.js');
const User = require('../../../src/models/user.model.js');
const Blacklist = require('../../../src/models/blackList.model.js');
const config = require('../../../src/config/config.js');

describe('🔒 Complete Auth Architecture Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock behavior to keep standard flows active
    mockRedisClient.isOpen = true;
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.set.mockResolvedValue('OK');
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Blacklist.deleteMany({});
  });

  // ── 3. PHASE 1 REGISTRATION Lifecycle ──────────────────────────────────────
  describe('POST /api/v1/auth/register-request', () => {
    it('should fail with status 400 when registration parameters are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-request')
        .send({ email: 'test@domain.com' }); // missing userName and password

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('failed');
      expect(res.body.message).toContain('Please provide all required parameters');
    });

    it('should fail with status 400 if user account profile already exists', async () => {
      await User.create({
        username: 'existinguser',
        email: 'existing@domain.com',
        password: 'Password123!'
      });

      const res = await request(app)
        .post('/api/v1/auth/register-request')
        .send({
          userName: 'existinguser',
          email: 'newemail@domain.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('failed');
      expect(res.body.message).toContain('User account profile already exists');
    });

    it('should successfully store registration payload details and send an OTP code', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-request')
        .send({
          userName: 'freshuser',
          email: 'fresh@domain.com',
          password: 'SecurePassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toContain('verification validation code has been sent');
      expect(mockRedisClient.set).toHaveBeenCalled();
    });

    it('should fall back to local internal cache cleanly if Redis connectivity is broken', async () => {
      mockRedisClient.isOpen = false; // Kill Redis client connection wrapper

      const res = await request(app)
        .post('/api/v1/auth/register-request')
        .send({
          userName: 'localuser',
          email: 'localcache@domain.com',
          password: 'SecurePassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
    });

    it('should trigger global next handler when experiencing structural collection faults', async () => {
      // Force Mongoose collection fault by passing an object structure that breaks findOne search validation
      const res = await request(app)
        .post('/api/v1/auth/register-request')
        .send({ userName: { $invalidOp: true }, email: 'fault@domain.com', password: 'password' });

      expect(res.status).toBe(500);
    });
  });

  // ── 4. PHASE 2 REGISTRATION Verification ───────────────────────────────────
  describe('POST /api/v1/auth/register-verify', () => {
    it('should reject requests containing missing mandatory inputs', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register-verify')
        .send({ email: 'test@domain.com' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('failed');
    });

    it('should reject verification if cache check returns null or expiration window closes', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/register-verify')
        .send({ email: 'ghost@domain.com', otp: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Verification key invalid or expired');
    });

    it('should block verification attempts containing incorrect OTP keys', async () => {
      const storedPayload = {
        otp: '999999',
        payload: { userName: 'test', email: 'v@test.com', password: 'password123' }
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(storedPayload));

      const res = await request(app)
        .post('/api/v1/auth/register-verify')
        .send({ email: 'v@test.com', otp: '111111' }); // Mismatched payload key string

      expect(res.status).toBe(400);
    });

    it('should register user and drop auth cookie when validation checks match', async () => {
      const storedPayload = {
        otp: '123456',
        payload: { userName: 'newverified', email: 'verified@domain.com', password: 'Password123!' }
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(storedPayload));

      const res = await request(app)
        .post('/api/v1/auth/register-verify')
        .send({ email: 'verified@domain.com', otp: '123456' });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.user.username).toBe('newverified');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should fall back to matching data flags via local memory maps on verify operations', async () => {
      mockRedisClient.isOpen = false; // Close Redis node routing pathway

      // Seed local internal memory map cache by using Phase 1 controller entry point
      await request(app)
        .post('/api/v1/auth/register-request')
        .send({ userName: 'memuser', email: 'mem@domain.com', password: 'Password123!' });

      // Trigger standard validation flow with missing or invalid key parameter parameters
      const res = await request(app)
        .post('/api/v1/auth/register-verify')
        .send({ email: 'mem@domain.com', otp: '000000' });

      expect(res.status).toBe(400);
    });
  });

  // ── 5. USER AUTHENTICATION Lifecycle ───────────────────────────────────────
  describe('POST /api/v1/auth/login', () => {
    it('should reject login actions when required values are missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com' });

      expect(res.status).toBe(400);
    });

    it('should refuse access if email match lookup checks return completely empty', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'missing@test.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Invalid account identification credentials');
    });

    it('should reject credentials if password checks return false validation matches', async () => {
      await User.create({
        username: 'logintest',
        email: 'login@test.com',
        password: 'CorrectPassword123'
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'login@test.com', password: 'WrongPassword' });

      expect(res.status).toBe(401);
    });

    it('should dispatch an OTP token check flag for accounts matching registration entries', async () => {
      await User.create({
        username: 'activeuser',
        email: 'active@test.com',
        password: 'Password123!'
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'active@test.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Verification matrix deployed securely');
    });
  });

  // ── 6. TWO-FACTOR LOGIN VERIFICATION Lifecycle ─────────────────────────────
  describe('POST /api/v1/auth/login-verify', () => {
    it('should safely authorize verified accounts and return signature footprints', async () => {
      const user = await User.create({
        username: 'twofactor',
        email: '2fa@test.com',
        password: 'Password123!'
      });

      const cachedLogin = {
        otp: '777888',
        payload: { id: user._id.toString() }
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedLogin));

      const res = await request(app)
        .post('/api/v1/auth/login-verify')
        .send({ email: '2fa@test.com', otp: '777888' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject dynamic code verification profiles if user records do not match', async () => {
      const cachedLogin = {
        otp: '111222',
        payload: { id: new User()._id.toString() } // Random structural object signature id
      };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedLogin));

      const res = await request(app)
        .post('/api/v1/auth/login-verify')
        .send({ email: '2fa@test.com', otp: '111222' });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Account instance lookup trace dropped');
    });
  });

  // ── 7. PRIVATE SESSION AND MIDDLEWARE SECURITY CONTROLS ────────────────────
  describe('🔒 Session Control Middleware Boundaries', () => {
    it('should block actions if token checks across header and cookies return null strings', async () => {
      const res = await request(app).get('/api/v1/auth/get-me');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('No session token found');
    });

    it('should reject signatures failing signature verification metrics', async () => {
      const res = await request(app)
        .get('/api/v1/auth/get-me')
        .set('Cookie', 'token=invalid_signature_format_string');

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Session expired or signature verification failed');
    });

    it('should intercept execution if current session parameters match target blacklist keys', async () => {
      const secret = config.jwt.secret || 'test_jwt_secret_key_scrapper_soul';
      const token = jwt.sign({ id: new User()._id }, secret);
      mockRedisClient.get.mockResolvedValue('blacklisted');

      const res = await request(app)
        .get('/api/v1/auth/get-me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Token has been invalidated');
    });

    it('should block authorization paths if matching profile rows have been removed completely', async () => {
      const secret = config.jwt.secret || 'test_jwt_secret_key_scrapper_soul';
      const token = jwt.sign({ id: new User()._id, tokenVersion: 0 }, secret);

      const res = await request(app)
        .get('/api/v1/auth/get-me')
        .set('Cookie', `token=${token}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('User session context no longer exists');
    });

    it('should trigger validation failure if session versions do not match active record stamps', async () => {
      const user = await User.create({
        username: 'sessionuser',
        email: 'session@test.com',
        password: 'Password123!',
        tokenVersion: 5 // Advanced version state marker
      });

      const secret = config.jwt.secret || 'test_jwt_secret_key_scrapper_soul';
      const staleToken = jwt.sign({ id: user._id, tokenVersion: 2 }, secret); // Mismatched stale token version

      const res = await request(app)
        .get('/api/v1/auth/get-me')
        .set('Cookie', `token=${staleToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Session invalidated globally');
    });

    it('should parse profile data records properly on happy verification paths', async () => {
      const user = await User.create({
        username: 'profileok',
        email: 'profile@test.com',
        password: 'Password123!'
      });
      const token = user.generateAuthToken();

      const res = await request(app)
        .get('/api/v1/auth/get-me')
        .set('Cookie', `token=${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.user.username).toBe('profileok');
    });
  });

  // ── 8. SINGLE AND MULTI-DEVICE SESSION RECOVERY AND MANAGEMENT ─────────────
  describe('POST /api/v1/auth/logout & logout-all', () => {
    // Inside tests/Upstash/integration/auth.routes.test.js
it('should clean user token reference pointers and register trace on local database engine', async () => {
    const user = await User.create({
        username: 'testlogout',
        email: 'logout-db@test.com',
        password: 'Password123!'
    });

    // Generate a structurally sound JWT token string
    const token = user.generateAuthToken();

    const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', `token=${token}`); // Pass the valid token string

    expect(res.status).toBe(200);

    const dbBlacklistRecord = await Blacklist.findOne({ token });
    expect(dbBlacklistRecord).not.toBeNull();
});

    it('should complete active session drops even when remote server engine configurations are down', async () => {
      mockRedisClient.isOpen = false; // Server drop trace mock simulation flag
      const user = await User.create({ username: 'logout2', email: 'l2@test.com', password: 'Password123!' });
      const token = user.generateAuthToken();

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', `token=${token}`);

      expect(res.status).toBe(200);
    });

    it('should increment active version counters to execute multi-device logouts', async () => {
      const user = await User.create({ username: 'logoutall', email: 'la@test.com', password: 'Password123!' });
      const token = user.generateAuthToken();

      const res = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Cookie', `token=${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Logged out from all devices successfully');

      const updatedUser = await User.findById(user._id).select('+tokenVersion');
      expect(updatedUser.tokenVersion).toBe(1);
    });
  });

  // ── 9. PASSCODE MANAGEMENT AND RECOVERY LIFECYCLES ──────────────────────────
  describe('POST /api/v1/auth/forgot-password', () => {
    it('should refuse requests missing mandatory parameter constraints', async () => {
      const res = await request(app).post('/api/v1/auth/forgot-password').send({});
      expect(res.status).toBe(400);
    });

    it('should gracefully mask validation and return status 200 for untracked emails to block data mining attempts', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'shadow@test.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('If your email address is registered');
    });

    it('should issue tokens, save tracking fields on profile rows, and send emails', async () => {
      await User.create({ username: 'lostpwd', email: 'lost@test.com', password: 'Password123!' });

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'lost@test.com' });

      expect(res.status).toBe(200);

      const updatedUser = await User.findOne({ email: 'lost@test.com' });
      expect(updatedUser.resetPasswordToken).not.toBeNull();
      expect(updatedUser.resetPasswordExpiry).not.toBeNull();
    });
  });

  describe('POST /api/v1/auth/reset-password/:token', () => {
    it('should reject updates with missing or structurally invalid parameter limits', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password/mock-token')
        .send({ password: '12' }); // Mismatched password length constraint validation boundary

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Password must be at least 6 characters');
    });

    it('should fail with status 400 when execution parameters or bodies are omitted entirely', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password/mock-token')
        .send({});

      expect(res.status).toBe(400);
    });

    it('should block password changes if lookup traces present expired validation stamps', async () => {
      const rawToken = 'expiredtokenstring123';
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      await User.create({
        username: 'expiredguy',
        email: 'expired@test.com',
        password: 'Password123!',
        resetPasswordToken: hashedToken,
        resetPasswordExpiry: new Date(Date.now() - 5000) // 5 seconds in the past
      });

      const res = await request(app)
        .post(`/api/v1/auth/reset-password/${rawToken}`)
        .send({ password: 'NewPassword123!' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Reset token is invalid or has expired');
    });

    it('should apply modifications to fields and refresh user account structures on match operations', async () => {
      const rawToken = 'validtokenstring123';
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      const user = await User.create({
        username: 'happyreset',
        email: 'happy@test.com',
        password: 'OldPassword123!',
        resetPasswordToken: hashedToken,
        resetPasswordExpiry: new Date(Date.now() + 60000), // Valid lifecycle remaining
        tokenVersion: 0
      });

      const res = await request(app)
        .post(`/api/v1/auth/reset-password/${rawToken}`)
        .send({ password: 'BrandNewPassword123!' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Password reset successfully');

      const freshRecord = await User.findById(user._id).select('+tokenVersion');
      expect(freshRecord.resetPasswordToken).toBeNull();
      expect(freshRecord.tokenVersion).toBe(1); // Confirm global session drop version updates applied cleanly
    });
  });
});
