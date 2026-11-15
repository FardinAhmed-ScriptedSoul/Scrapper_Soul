const crypto = require('crypto');
const redisClient = require('../config/redis.config.js');
const { sendEmail } = require('../services/mail.services.js');

// Fallback in-memory cache if Redis is down
const localOtpCache = new Map();

/**
 * 🔢 Generates, caches, and sends a secure 5-minute numeric verification code.
 * @param {string} username Recipient username context (Defaults to 'User' if not present)
 * @param {string} email Target account email destination
 * @param {Object} payload Metagroup payload data to cache (e.g., password, user identifier)
 * @param {string} purpose 'registration' or 'login'
 */
async function sendAndStoreOTP(username, email, payload, purpose = 'registration') {
    // 1. Safe fallback formatting for clean email greetings
    const fallbackName = username || 'User';

    // 2. Generate a secure random 6-digit numeric string
    const otp = crypto.randomInt(100000, 999999).toString();
    const cacheKey = `${purpose}_pending:${email}`;
    const cacheData = { otp, payload };
    const TTL_SECONDS = 5 * 60; // 5 minutes lifetime window

    // 3. Commit OTP data state to active availability caches
    if (redisClient && redisClient.isOpen) {
        await redisClient.set(cacheKey, JSON.stringify(cacheData), { EX: TTL_SECONDS });
    } else {
        // Graceful degradation fallback to local server process memory
        localOtpCache.set(cacheKey, {
            ...cacheData,
            expiresAt: Date.now() + (TTL_SECONDS * 1000)
        });
    }

    // 4. Construct and dispatch the notification layer
    // ✅ BRANDING UPDATED: Keep titles clean and focused on your platform
    const mailSubject = purpose === 'registration' 
        ? '🛡️ Verify Your Scrapper-Soul Registration' 
        : '🔑 Scrapper-Soul Dual-Factor Verification';

    const textFallback = `Hello ${fallbackName},\n\nYour 6-digit verification code is: ${otp}\n\nThis security marker remains operational for exactly 5 minutes.`;
    
    const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #2F80ED; text-align: center; margin-bottom: 20px;">Scrapper-Soul Identity Verification</h2>
            <p>Hello <strong>${fallbackName}</strong>,</p>
            <p>Please implement the security verification token footprint below to authenticate your operational request:</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2F80ED; padding: 10px 25px; background-color: #F2F9FF; border-radius: 5px; border: 1px dashed #2F80ED;">${otp}</span>
            </div>
            <p style="font-size: 0.85em; color: #828282; text-align: center;">This unique credential instance expires automatically 5 minutes from generation.</p>
        </div>
    `;

    // Fire email asynchronously without making the API controller route block waiting for network hops
    sendEmail(email, mailSubject, textFallback, htmlBody).catch(err => {
        console.error(`❌ Non-blocking Email Exception inside OTP service layer:`, err.message);
    });

    // ✅ SECURED: Commented out to prevent active credentials from logging to your development terminal.
    // console.log(`[DEV MONITOR LOG] Issued ${purpose.toUpperCase()} Token for ${email} -> [ ${otp} ]`);
    
    // Optional secure alternative: Log that an event happened without logging the secret value itself
    console.log(`[SECURITY] Dispatched ${purpose.toUpperCase()} OTP cache token safely to ${email}.`);

    return true;
}

/**
 * 🔍 Validates token matching footprint and returns data payload structure if safe
 * @param {string} email User instance lookup index
 * @param {string} inputOtp Candidate numeric key supplied by request body parameters
 * @param {string} purpose 'registration' or 'login'
 */
async function verifyCachedOTPToken(email, inputOtp, purpose = 'registration') {
    const cacheKey = `${purpose}_pending:${email}`;
    let cachedRecord = null;

    if (redisClient && redisClient.isOpen) {
        const valueString = await redisClient.get(cacheKey);
        if (valueString) cachedRecord = JSON.parse(valueString);
    } else {
        const record = localOtpCache.get(cacheKey);
        if (record) {
            if (Date.now() > record.expiresAt) {
                localOtpCache.delete(cacheKey); // Clean up stale trace
            } else {
                cachedRecord = record;
            }
        }
    }

    if (!cachedRecord) return null;

    // String match test to avoid token casting errors
    if (cachedRecord.otp.toString().trim() !== inputOtp.toString().trim()) {
        return null;
    }

    return cachedRecord.payload;
}

// Clear memory maps periodically to keep memory usage minimal
if (process.env.NODE_ENV !== 'test') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of localOtpCache.entries()) {
      if (now > data.expiresAt) localOtpCache.delete(key);
    }
  }, 5 * 60 * 1000);
}

module.exports = {
    sendAndStoreOTP,
    verifyCachedOTPToken
};