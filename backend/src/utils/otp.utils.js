const crypto = require('crypto');

/**
 * Generates a cryptographically strong 6-digit numeric OTP string
 * @returns {string} 6-digit string
 */
const generateNumericOTP = () => {
  // Generates a random integer between 100000 and 999999
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Generates a high-entropy hex token along with its SHA-256 hash for database tracking
 * @returns {Object} rawToken (sent to user link) and hashedToken (saved to DB)
 */
const generateResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
};

// ✅ Export BOTH functions so the controller can destructure them cleanly
module.exports = { 
  generateNumericOTP,
  generateResetToken 
};