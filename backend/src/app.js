const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser'); // 🍪 IMPORTANT: Required to parse JWT tokens from cookies
const scraperRouter = require('./routes/scraper.routes.js');
const authRouter = require('./routes/auth.routes.js'); // ✅ 1. Import your auth router
const { getNewsFeed } = require('./controllers/scraper.controller.js'); 

const app = express();

// Standard middleware stack configuration
app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : 'http://localhost:5173', // Better security than '*'
  credentials: true // 🔒 Required to handle session cookies securely between frontend and backend
})); 
app.use(express.json({ limit: '16kb' })); 
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(cookieParser()); // 🍪 ✅ 2. Mount cookie parser middleware before any authentication route checking

// Heartbeat baseline health checkpoint route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'online', 
    message: 'The local data engine is fully responsive and running cleanly.' 
  });
});

// New Dashboard Feed Timeline Routing Mount
app.get('/api/v1/feed', getNewsFeed); 

// Global API Version 1 Routing Mounts
app.use('/api/v1/auth', authRouter); // ✅ 3. Mount your authentication endpoints here
app.use('/api/v1/scrape', scraperRouter);

module.exports = app;