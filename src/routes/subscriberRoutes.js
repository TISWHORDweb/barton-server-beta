const express = require('express');
const {
  subscribe,
  verifySubscription,
  unsubscribe,
  getSubscribers,
  getSubscriberStats,
  updateSubscriber,
  deleteSubscriber
} = require('../controllers/subscriberController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/subscribe', subscribe);
router.get('/verify/:token', verifySubscription);
router.get('/unsubscribe/:token', unsubscribe);

// Protected routes
router.use(protect);
router.use(authorize('admin', 'editor'));

router.route('/')
  .get(getSubscribers);

router.route('/stats')
  .get(getSubscriberStats);

router.route('/:id')
  .put(updateSubscriber)
  .delete(deleteSubscriber);

module.exports = router;