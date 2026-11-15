const express = require('express');
const protect = require('../middleware/auth.middleware.js');
const {
  getPreferences,
  updatePreferences
} = require('../controllers/notification.controller.js');

const router = express.Router();

router.use(protect);
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

module.exports = router;
