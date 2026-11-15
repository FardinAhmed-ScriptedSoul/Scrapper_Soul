const express = require('express');
const protect = require('../middleware/auth.middleware.js');
const feedRefreshLimiter = require('../middleware/feedRefreshLimiter.middleware.js');
const {
  getFeedStatus,
  refreshFeeds
} = require('../controllers/feedStatus.controller.js');

const router = express.Router();

router.use(protect);
router.get('/', getFeedStatus);
router.post('/refresh', feedRefreshLimiter, refreshFeeds);

module.exports = router;
