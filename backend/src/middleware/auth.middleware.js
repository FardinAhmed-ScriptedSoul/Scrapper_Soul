// backend/src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const config = require('../config/config.js');
const userModel = require('../models/user.model.js');
const redisClient = require('../config/redis.config.js');

async function protect(req, res, next) {
    try {
        let token;

        // 1. Safely parse out authorization tokens from cookies
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } 
        // 2. Fallback check for standard Authorization bearer headers
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // Catch missing session credentials early
        if (!token) {
            return res.status(401).json({ 
                status: "failed", 
                message: "No session token found. Access denied." 
            });
        }

        // 3. Verify signature using the identical frozen string reference from your centralized config
        const targetSecret = config.jwt.secret || process.env.JWT_SECRET;
        const decoded = jwt.verify(token, targetSecret);

        // 4. Check Redis memory layer to see if token was blacklisted via active single logout actions
        if (redisClient && redisClient.isOpen) {
            const isBlacklisted = await redisClient.get(`blacklist:${token}`);
            if (isBlacklisted) {
                return res.status(401).json({ status: "failed", message: "Token has been invalidated via single device logout." });
            }
        }

        // 5. Query user records and verify token version matches for global multi-device logs protection
        const user = await userModel.findById(decoded.id).select("+tokenVersion");
        if (!user) {
            return res.status(401).json({ status: "failed", message: "User session context no longer exists." });
        }

        // Verify token version matches database record (protects logoutFromAllDevices actions)
        if (decoded.tokenVersion !== (user.tokenVersion || 0)) {
            return res.status(401).json({ status: "failed", message: "Session invalidated globally via multi-device logout." });
        }

        // Bind references cleanly onto request object execution frame
        req.user = user;
        req.token = token;
        
        return next();
    } catch (error) {
        console.error("🔒 Auth Middleware Exception Details:", error.message);
        return res.status(401).json({ 
            status: "failed", 
            message: "Session expired or signature verification failed. Please re-authenticate.",
            details: error.message
        });
    }
}

module.exports = protect;