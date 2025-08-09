const express = require('express');
const {
  getSettings,
  getPublicSettings,
  getSetting,
  createOrUpdateSetting,
  updateSettings,
  deleteSetting,
  initializeSettings
} = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/public', getPublicSettings);

// Protected routes
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getSettings)
  .post(createOrUpdateSetting);

router.post('/initialize', initializeSettings);
router.put('/bulk', updateSettings);

router.route('/:key')
  .get(getSetting)
  .delete(deleteSetting);

module.exports = router;