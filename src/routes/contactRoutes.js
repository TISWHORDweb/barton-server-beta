const express = require('express');
const {
  submitContact,
  getContacts,
  getContact,
  updateContact,
  deleteContact,
  getContactStats
} = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', submitContact);

// Protect all routes below
// router.use(protect);
// router.use(authorize('admin', 'editor'));

router.route('/')
  .get(getContacts);

router.route('/stats')
  .get(getContactStats);

router.route('/:id')
  .get(getContact)
  .put(updateContact)
  .delete(deleteContact);


module.exports = router;