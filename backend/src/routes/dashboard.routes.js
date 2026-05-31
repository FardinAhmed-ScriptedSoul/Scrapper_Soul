// backend/src/routes/dashboard.routes.js
const express = require('express');
const router = express.Router();
const dashboardCtrl = require('../controllers/dashboard.controller.js');

// ✅ FIXED: Import protect directly since module.exports = protect
const protect = require('../middleware/auth.middleware.js');

// 🔒 Security Layer: Secure all dashboard panels with your session verification guard
router.use(protect);

// --- Core Telemetry Pipelines ---
router.get('/telemetry', dashboardCtrl.getTelemetryData);
router.get('/tasks', dashboardCtrl.getTasks);
router.get('/proxies', dashboardCtrl.getProxies);

// --- Adaptive System Configurations ---
router.route('/settings')
  .get(dashboardCtrl.getSettings)
  .post(dashboardCtrl.getSettings)
  .put(dashboardCtrl.getSettings);

module.exports = router;