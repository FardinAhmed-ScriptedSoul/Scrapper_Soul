const express = require('express');
const cors = require('cors');
const app = express();

// Standard middleware stack configuration
app.use(cors({ origin: '*' })); // Allows your upcoming Vite React dashboard to make API requests safely
app.use(express.json({ limit: '16kb' })); // Ready to parse incoming scraping requests
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// Heartbeat baseline health checkpoint route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'online', 
    message: 'The local data engine is fully responsive and running cleanly.' 
  });
});

module.exports  = app;