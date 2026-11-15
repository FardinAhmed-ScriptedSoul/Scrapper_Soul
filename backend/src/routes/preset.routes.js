const express = require('express');
const protect = require('../middleware/auth.middleware.js');
const {
  listPresets,
  createPreset,
  updatePreset,
  deletePreset,
  runPreset
} = require('../controllers/preset.controller.js');

const router = express.Router();

router.use(protect);
router.get('/', listPresets);
router.post('/', createPreset);
router.put('/:id', updatePreset);
router.delete('/:id', deletePreset);
router.post('/:id/run', runPreset);

module.exports = router;
