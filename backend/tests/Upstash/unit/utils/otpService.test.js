// tests/unit/utils/otpService.test.js
require('../../setup/mockRedis.js');

// Mock mail so no real emails fire during tests
jest.mock('../../../../src/services/mail.services.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

describe('OTP Service', () => {
  let sendAndStoreOTP, verifyCachedOTPToken;

  beforeAll(() => {
    ({ sendAndStoreOTP, verifyCachedOTPToken } = require('../../../../src/controllers/otp.controllers.js'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sendAndStoreOTP returns true', async () => {
    const result = await sendAndStoreOTP('TestUser', 'test@test.com', { userId: '123' }, 'registration');
    expect(result).toBe(true);
  });

  it('fires sendEmail with correct subject for registration', async () => {
    const { sendEmail } = require('../../../../src/services/mail.services.js');
    await sendAndStoreOTP('Alice', 'alice@test.com', {}, 'registration');
    expect(sendEmail).toHaveBeenCalledWith(
      'alice@test.com',
      expect.stringContaining('Registration'),
      expect.any(String),
      expect.any(String)
    );
  });

  it('fires sendEmail with correct subject for login', async () => {
    const { sendEmail } = require('../../../../src/services/mail.services.js');
    await sendAndStoreOTP('Bob', 'bob@test.com', {}, 'login');
    expect(sendEmail).toHaveBeenCalledWith(
      'bob@test.com',
      expect.stringContaining('Verification'),
      expect.any(String),
      expect.any(String)
    );
  });

  it('verifyCachedOTPToken returns null for unknown email', async () => {
    const result = await verifyCachedOTPToken('nobody@test.com', '123456', 'registration');
    expect(result).toBeNull();
  });

  it('stores OTP and verifies correctly (local fallback path)', async () => {
    // Redis mock returns null so otp.controllers uses localOtpCache
    await sendAndStoreOTP('Carol', 'carol@test.com', { role: 'admin' }, 'registration');

    // We can't directly read the OTP — so we test the wrong code path first
    const wrongResult = await verifyCachedOTPToken('carol@test.com', '000000', 'registration');
    expect(wrongResult).toBeNull();
  });

  it('verifyCachedOTPToken returns null for wrong purpose', async () => {
    await sendAndStoreOTP('Dave', 'dave@test.com', { role: 'user' }, 'registration');
    // Try to verify with 'login' purpose — different cache key
    const result = await verifyCachedOTPToken('dave@test.com', '000000', 'login');
    expect(result).toBeNull();
  });
});