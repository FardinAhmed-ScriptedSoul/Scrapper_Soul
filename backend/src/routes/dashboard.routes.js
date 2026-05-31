
// backend/src/routes/dashboard.routes.js
const express = require('express');
const router  = express.Router();
const dashboardCtrl = require('../controllers/dashboard.controller.js');
const protect = require('../middleware/auth.middleware.js');

router.use(protect);

// Telemetry
router.get('/telemetry', dashboardCtrl.getTelemetryData);

// Task queue — read + control
router.get('/tasks',         dashboardCtrl.getTasks);
router.post('/tasks/control', dashboardCtrl.controlTask);

// Schedules — full CRUD
router.get('/schedules',        dashboardCtrl.getSchedules);
router.post('/schedules',       dashboardCtrl.createSchedule);
router.put('/schedules/:id',    dashboardCtrl.updateSchedule);
router.delete('/schedules/:id', dashboardCtrl.deleteSchedule);

// Settings — per user, persisted in MongoDB
router.get('/settings', dashboardCtrl.getSettings);
router.put('/settings', dashboardCtrl.saveSettings);
router.post('/settings', dashboardCtrl.saveSettings);

// Proxies
router.get('/proxies', dashboardCtrl.getProxies);

module.exports = router;
