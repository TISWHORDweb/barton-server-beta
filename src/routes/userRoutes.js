const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getUserStats,
  getDashboardAnalytics
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// // Protect all routes
// router.use(protect);

router.route('/')
  .get(getUsers);

router.route('/dashboard')
  .get(getDashboardAnalytics);

router.route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;