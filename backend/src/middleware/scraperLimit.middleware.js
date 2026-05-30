const { rateLimit } = require('express-rate-limit');

/**
 * ⏱️ Web Scraper Specific Rate Limiter
 * Protects intensive web-scraping endpoints from abuse.
 * Allows 15 requests per 15 minutes per IP address.
 */
const scraperLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 15, // Limit each IP to 15 scraping attempts per window
    standardHeaders: 'draft-7', // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        status: "failed",
        message: "Too many scraping operations initiated from this IP address. Please wait 15 minutes before collecting new engine results."
    }
});

module.exports = scraperLimiter;