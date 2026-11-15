const express = require('express');
const protect = require('../middleware/auth.middleware.js');
const { listResults } = require('../controllers/results.controller.js');

const router = express.Router();

router.use(protect);
router.get('/', listResults);

module.exports = router;
