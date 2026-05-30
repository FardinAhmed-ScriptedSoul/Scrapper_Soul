const config = require('../config/config.js');
const userModel = require('../models/user.model.js');
const blacklistModel = require('../models/blackList.model.js');
const redisClient = require('../config/redis.config.js');
const { sendEmail } = require('../services/mail.services.js'); 
const { sendAndStoreOTP, verifyCachedOTPToken } = require('./otp.controllers.js');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateResetToken } = require('../utils/otp.utils.js');

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: config.env === 'production' || process.env.CODESPACES === 'true',   
    sameSite: config.env === 'production' || process.env.CODESPACES === 'true' ? 'none' : 'lax', 
    maxAge: 7 * 24 * 60 * 60 * 1000 
};

/**
 * @controller registerUserController
 * @description Phase 1: Validates options and hands off registration processing to the OTP engine
 */
async function registerUserController(req, res, next) {
    try {
        const { userName, email, password } = req.body;

        if (!userName || !email || !password) {
            return res.status(400).json({ status: "failed", message: "Please provide all required parameters." });
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ status: "failed", message: "An account with this email address already exists." });
        }

        await sendAndStoreOTP(userName, email, { username: userName, email, password }, 'registration');

        return res.status(200).json({
            status: "success",
            message: "A verification validation code has been sent to your email. Please verify within 5 minutes."
        });
    } catch (error) {
        next(error); 
    }
}

/**
 * @controller verifyOTPAndRegisterController
 * @description Phase 2: Verifies registration OTP and registers user instance to MongoDB
 */
async function verifyOTPAndRegisterController(req, res, next) {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ status: "failed", message: "Email and confirmation OTP parameters are required." });
        }

        const validatedPayload = await verifyCachedOTPToken(email, otp, 'registration');
        
        if (!validatedPayload) {
            return res.status(401).json({ 
                status: "failed", 
                message: "Invalid or expired confirmation verification token provided." 
            });
        }

        const user = await userModel.create({
            username: validatedPayload.username,
            email: validatedPayload.email,
            password: validatedPayload.password
        });

        const token = user.generateAuthToken();
        
        if (redisClient && redisClient.isOpen) {
            await redisClient.del(`registration_pending:${email}`);
        }

        const welcomeSubject = `Welcome to Scrapper-Soul! 🚀`;
        const welcomeTextFallback = `Hello ${user.username},\n\nWelcome to Scrapper-Soul! We are excited to welcome you aboard our production automation environment.`;
        const welcomeHtmlBody = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #2F80ED; text-align: center;">Welcome to Scrapper-Soul, ${user.username}! 👋</h2>
                <p>We are thrilled to have you join our platform. Prepare to streamline your automation tasks and deploy deep-data backend solutions seamlessly.</p>
                <p style="font-size: 0.9em; color: #666; text-align: center; margin-top: 30px;">Happy developing!<br><strong>The Scrapper-Soul Team</strong></p>
            </div>
        `;

        sendEmail(user.email, welcomeSubject, welcomeTextFallback, welcomeHtmlBody).catch(err => {
            console.error("❌ Silent Fallback: Welcome email failed to send:", err.message);
        });

        return res
            .status(201)
            .cookie("token", token, COOKIE_OPTIONS)
            .json({
                status: "success",
                message: "Email identity verified. Account established successfully.",
                data: {
                    user: { id: user._id, username: user.username, email: user.email }
                }
            });
    } catch (error) {
        next(error);
    }
}

/**
 * @controller loginUserController
 * @description Step 1 of 2-Step Login: Validates base password credentials and queues OTP code to memory
 */
async function loginUserController(req, res, next) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ status: "failed", message: "Email and password parameters are mandatory." });
        }

        const user = await userModel.findOne({ email }).select("+password");
        
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ status: "failed", message: "Invalid credentials provided." });
        }

        await sendAndStoreOTP(user.username, user.email, { userId: user._id }, 'login');

        return res.status(200).json({
            status: "pending_verification",
            message: "Step-1 authentication passed. A login verification OTP code has been dispatched to your email address."
        });
    } catch (error) {
        next(error);
    }
}

/**
 * @controller verifyOTPAndLoginController
 * @description Step 2 of 2-Step Login: Asserts verification code match and provisions signed JWT session cookie
 */
async function verifyOTPAndLoginController(req, res, next) {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ status: "failed", message: "Email validation and numeric code parameters are missing." });
        }

        const validatedPayload = await verifyCachedOTPToken(email, otp, 'login');
        if (!validatedPayload) {
            return res.status(401).json({ status: "failed", message: "Invalid or expired login verification code." });
        }

        const user = await userModel.findById(validatedPayload.userId).select("+tokenVersion");
        if (!user) {
            return res.status(404).json({ status: "failed", message: "Associated account not found." });
        }

        const token = user.generateAuthToken();

        if (redisClient && redisClient.isOpen) {
            await redisClient.del(`login_pending:${email}`);
        }

        return res
            .status(200)
            .cookie("token", token, COOKIE_OPTIONS)
            .json({
                status: "success",
                message: "2-Step authorization passed. Authentication session established.",
                data: {
                    user: { id: user._id, username: user.username, email: user.email }
                }
            });
    } catch (error) {
        next(error);
    }
}

/**
 * @controller logoutUserController
 * @description Invalidates token instantly inside operational RAM and backstop DB models
 */
async function logoutUserController(req, res, next) {
    try {
        // ✅ FIXED: Multi-layer secure extraction fallback loop 
        const token = req.token || req.cookies.token || (req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null);

        if (!token) {
            return res.status(400).json({ status: "failed", message: "No active session token found to destroy." });
        }

        let remainingSeconds = 3600; 

        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.exp) {
                remainingSeconds = decoded.exp - Math.floor(Date.now() / 1000);
            }
        } catch (e) { }

        if (remainingSeconds > 0) {
            if (redisClient && redisClient.isOpen) {
                await redisClient.set(`blacklist:${token}`, 'true', { EX: remainingSeconds });
            }
            const expiresAtDate = new Date(Date.now() + remainingSeconds * 1000);
            await blacklistModel.create({ token, expiresAt: expiresAtDate }).catch(() => {});
        }

        return res
            .status(200)
            .clearCookie("token", COOKIE_OPTIONS)
            .json({ status: "success", message: "Logged out completely and securely." });
    } catch (error) {
        next(error);
    }
}

/**
 * @controller logoutFromAllDevicesController
 * @description Forceful multi-device log out tracking: updates tokenVersion tracking variable
 */
async function logoutFromAllDevicesController(req, res, next) {
    try {
        if (!req.user || !req.user._id) {
            return res.status(401).json({ status: "failed", message: "Unauthorized. User context missing." });
        }

        await userModel.findByIdAndUpdate(req.user._id, { $inc: { tokenVersion: 1 } });

        // ✅ FIXED: Extraction loop applied to global multi-device logout
        const token = req.token || req.cookies.token || (req.headers.authorization?.startsWith('Bearer') ? req.headers.authorization.split(' ')[1] : null);
        
        if (token) {
            if (redisClient && redisClient.isOpen) {
                await redisClient.set(`blacklist:${token}`, 'true', { EX: 3600 });
            }
            await blacklistModel.create({ token, expiresAt: new Date(Date.now() + 3600 * 1000) }).catch(() => {});
        }

        return res
            .status(200)
            .clearCookie("token", COOKIE_OPTIONS)
            .json({ status: "success", message: "Global authorization revoked. Logged out of all devices completely." });
    } catch (error) {
        next(error);
    }
}

/**
 * @controller getMe
 * @description Automatically retrieves user context from the validation middleware wrapper layer. 
 */
async function getMe(req, res, next) {
    try {
        return res.status(200).json({
            status: "success",
            message: "User profile retrieved successfully.",
            data: {
                id: req.user._id,
                username: req.user.username,
                email: req.user.email,
                createdAt: req.user.createdAt
            }
        });
    } catch (error) {
        next(error); 
    }
}

/**
 * @controller forgotPasswordController
 * @description Dispatches high-entropy reset links safely styled for Scrapper-Soul profiles
 */
async function forgotPasswordController(req, res, next) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ status: "failed", message: "Email address is required." });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(200).json({
                status: "success",
                message: "If an account with that email exists, a reset link has been sent."
            });
        }

        const { rawToken, hashedToken } = generateResetToken();
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000); 
        await user.save();

        // ✅ FIXED: Dynamically handles GitHub Codespaces proxies if available, otherwise falls back smoothly
        let frontendUrl = config.env === 'production' ? process.env.FRONTEND_URL : 'http://localhost:5173';
        if (process.env.CODESPACE_NAME) {
            frontendUrl = `https://${process.env.CODESPACE_NAME}-5173.app.github.dev`;
        }

        const resetLink = `${frontendUrl}/reset-password/${rawToken}`;

        const emailHtmlBody = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h3 style="color: #2F80ED; margin-top: 0;">🔑 Reset Your Scrapper-Soul Password</h3>
                <p>Hello ${user.username},</p>
                <p>We received an execution request to change your password account credentials. Use the processing link below to modify your profile settings. This security link expires in 15 minutes:</p>
                <p style="text-align: center; margin: 25px 0;">
                    <a href="${resetLink}" style="background-color: #2F80ED; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Configure New Password</a>
                </p>
                <p style="word-break: break-all; font-size: 0.85em; color: #777;">If the button link does not open, copy-paste this direct URL structure into your browser window:<br>${resetLink}</p>
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                <p style="font-size: 0.8em; color: #999; margin-bottom: 0;">If you did not issue this token command sequence, you can safely disregard this email notification completely.</p>
            </div>
        `;

        sendEmail(user.email, '🔑 Reset Your Scrapper-Soul Password', `Reset Link: ${resetLink}`, emailHtmlBody)
            .catch(err => console.error("❌ Reset email delivery execution exception:", err.message));

        return res.status(200).json({
            status: "success",
            message: "If an account with that email exists, a reset link has been sent."
        });
    } catch (error) {
        next(error);
    }
}

/**
 * @controller resetPasswordController
 * @description Asserts hash token matching properties and patches credentials securely
 */
async function resetPasswordController(req, res, next) {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ status: "failed", message: "Reset token and new password parameters are required." });
        }
        if (password.length < 6) {
            return res.status(400).json({ status: "failed", message: "Password must be at least 6 characters long." });
        }

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const user = await userModel.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpiry: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ status: "failed", message: "Reset token is invalid or has expired." });
        }

        user.password = password;
        user.resetPasswordToken = null;
        user.resetPasswordExpiry = null;
        user.tokenVersion = (user.tokenVersion || 0) + 1; 
        await user.save();

        return res.status(200).json({
            status: "success",
            message: "Password reset successfully. Please log in with your new password credentials."
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    registerUserController,
    verifyOTPAndRegisterController,
    loginUserController,
    verifyOTPAndLoginController, 
    logoutUserController,
    logoutFromAllDevicesController,
    getMe,
    forgotPasswordController,   
    resetPasswordController     
};