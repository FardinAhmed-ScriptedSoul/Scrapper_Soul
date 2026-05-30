const express = require('express');
const router = express.Router();

// Import structural elements
const { searchAmazon, searchIndeed, searchBooking } = require('../controllers/scraper.controller.js');
const { validateScraperQuery } = require('../middleware/validateQuery.middleware.js');

// Import authentication and operational middlewares
const authMiddleware = require('../middleware/auth.middleware.js'); // ✅ Aligned path
const scraperLimiter = require('../middleware/scraperLimit.middleware.js'); 
const { trackActivity } = require('../middleware/activity.middleware.js'); 

// Apply global middleware to all downstream scraping routes (Auth + Rate Limiter + Tracker)
router.use(authMiddleware);
router.use(scraperLimiter);
router.use(trackActivity('scraping_operation'));

// 1. Amazon Inventory Endpoint
router.get('/amazon', validateScraperQuery(['query']), searchAmazon);

// 2. Indeed Job Engine Endpoint (Requires Role AND Location)
router.get('/indeed', validateScraperQuery(['role', 'location']), searchIndeed);

// 3. Booking Travel Engine Endpoint (Requires Destination, Check-In, and Check-Out timelines)
router.get('/booking', validateScraperQuery(['destination', 'checkIn', 'checkOut']), searchBooking);

module.exports = router;