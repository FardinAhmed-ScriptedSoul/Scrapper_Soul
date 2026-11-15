// tests/unit/utils/tokenUtils.test.js
require('../../setup/mockRedis.js');

describe('Token Utilities', () => {
  let generateNumericOTP, generateResetToken;

  beforeAll(() => {
   ({ generateNumericOTP, generateResetToken } = require('../../../../src/utils/otp.utils.js'));
  });

  describe('generateNumericOTP', () => {
    it('returns a 6-digit string', () => {
      const otp = generateNumericOTP();
      expect(typeof otp).toBe('string');
      expect(otp).toHaveLength(6);
      expect(/^\d{6}$/.test(otp)).toBe(true);
    });

    it('generates different values across calls', () => {
      const otps = new Set(Array.from({ length: 20 }, () => generateNumericOTP()));
      // At least some should differ (astronomically unlikely all 20 match)
      expect(otps.size).toBeGreaterThan(1);
    });

    it('value is between 100000 and 999999', () => {
      for (let i = 0; i < 50; i++) {
        const num = parseInt(generateNumericOTP(), 10);
        expect(num).toBeGreaterThanOrEqual(100000);
        expect(num).toBeLessThanOrEqual(999999);
      }
    });
  });

  describe('generateResetToken', () => {
    it('returns rawToken and hashedToken', () => {
      const { rawToken, hashedToken } = generateResetToken();
      expect(typeof rawToken).toBe('string');
      expect(typeof hashedToken).toBe('string');
      expect(rawToken).not.toBe(hashedToken);
    });

    it('rawToken is 64 hex chars (32 bytes)', () => {
      const { rawToken } = generateResetToken();
      expect(rawToken).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(rawToken)).toBe(true);
    });

    it('hashedToken is SHA-256 (64 hex chars)', () => {
      const { hashedToken } = generateResetToken();
      expect(hashedToken).toHaveLength(64);
    });

    it('different calls produce different tokens', () => {
      const a = generateResetToken();
      const b = generateResetToken();
      expect(a.rawToken).not.toBe(b.rawToken);
      expect(a.hashedToken).not.toBe(b.hashedToken);
    });
  });
});