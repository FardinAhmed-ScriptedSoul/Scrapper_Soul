// backend/src/middleware/auth.middleware.js
const jwt = require('jsonwebtoken');
const config = require('../config/config.js');
const { users } = require('../repositories');
const redisClient = require('../config/redis.config.js');

async function protect(req, res, next) {
    try {
        let token;

        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ 
                status: "failed", 
                message: "No session token found. Access denied." 
            });
        }

        const targetSecret = config.jwt.secret || process.env.JWT_SECRET;
        const decoded = jwt.verify(token, targetSecret);

        if (redisClient && redisClient.isOpen) {
            const isBlacklisted = await redisClient.get(`blacklist:${token}`);
            if (isBlacklisted) {
                return res.status(401).json({ status: "failed", message: "Token has been invalidated via single device logout." });
            }
        }

        // 🚀 FIX: Fetch EVERYTHING, but explicitly ask for the hidden select field (+tokenVersion)
        const userId = decoded.id || decoded._id;
        const user = await users.findById(userId, { select: '+tokenVersion' });
        
        if (!user) {
            return res.status(401).json({ status: "failed", message: "User session context no longer exists." });
        }

        // Verify token version matches database record
        if (decoded.tokenVersion !== (user.tokenVersion || 0)) {
            return res.status(401).json({ status: "failed", message: "Session invalidated globally via multi-device logout." });
        }

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