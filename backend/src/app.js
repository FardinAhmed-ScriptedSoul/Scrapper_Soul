// backend/src/app.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); 
const scraperRouter = require('./routes/scraper.routes.js');
const authRouter = require('./routes/auth.routes.js'); 
const dashboardRouter = require('./routes/dashboard.routes.js'); 
const { getNewsFeed } = require('./controllers/scraper.controller.js'); 

const app = express();

// Standard cross-origin resource sharing middleware stack configuration
app.use(cors({
    origin: 'http://localhost:5173', // ⚠️ CRITICAL: Replace with your exact frontend URL (Do NOT use '*')
    credentials: true,               // ⚠️ CRITICAL: Allows cookies to stay active across cross-origin refreshes
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS','PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '16kb' })); 
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser()); 

// Heartbeat baseline health checkpoint route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'online', 
    message: 'The local data engine is fully responsive and running cleanly.' 
  });
});

// ==========================================================================
// Global API Version 1 Routing Mounts
// ==========================================================================

// News Dashboard Feed Timeline Routing Mount
app.get('/api/v1/feed', getNewsFeed); 

// Authentication and Scraper Engines
app.use('/api/v1/auth', authRouter); 
app.use('/api/v1/scrape', scraperRouter);

// ✅ FIXED: Mount your dashboard router onto a SINGLE unified version 1 base path route.
// This guarantees that sub-routes match correctly:
// - GET /api/v1/dashboard/telemetry
// - GET /api/v1/dashboard/tasks
// - GET /api/v1/dashboard/proxies
// - /api/v1/dashboard/settings
app.use('/api/v1/dashboard', dashboardRouter);

module.exports = app;