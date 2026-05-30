const jwt = require('jsonwebtoken');
const config = require('../config/config.js');
const userModel = require('../models/user.model.js');
const redisClient = require('../config/redis.config.js');
const blacklistModel = require('../models/blackList.model.js');

async function protect(req, res, next) {
    try {
        let token;

        // 1. Check cookies container safely
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } 
        // 2. Fallback check for standard Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // If no token is extracted, throw an explicit error to avoid moving forward
        if (!token) {
            return res.status(401).json({ 
                status: "failed", 
                message: "No session token found. Please log in." 
            });
        }

        // 3. Verify token lifespan and signature integrity
        const decoded = jwt.verify(token, config.jwt.secret);

        // 4. Check memory layers to see if token was blacklisted via single logout
        if (redisClient && redisClient.isOpen) {
            const isBlacklisted = await redisClient.get(`blacklist:${token}`);
            if (isBlacklisted) {
                return res.status(401).json({ status: "failed", message: "Token has been invalidated via single device logout." });
            }
        }

        // 5. Query user records and verify token version match for global logout protection
        const user = await userModel.findById(decoded.id).select("+tokenVersion");
        if (!user) {
            return res.status(401).json({ status: "failed", message: "User session context no longer exists." });
        }

        // Verify token version matches database record (protects logoutFromAllDevices)
        if (decoded.tokenVersion !== (user.tokenVersion || 0)) {
            return res.status(401).json({ status: "failed", message: "Session invalidated globally via multi-device logout." });
        }

        // Success: Bind references cleanly onto request pipe
        req.user = user;
        req.token = token;
        
        next();
    } catch (error) {
        console.error("🔒 Auth Middleware Exception Details:", error.message);
        return res.status(401).json({ 
            status: "failed", 
            message: "Session expired or invalidated globally. Please re-authenticate." 
        });
    }
}

module.exports = protect;