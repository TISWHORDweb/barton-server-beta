const express = require('express');
const {
  getNewsletters,
  getNewsletter,
  createNewsletter,
  updateNewsletter,
  deleteNewsletter,
  sendNewsletter,
  getNewslettersByType
} = require('../controllers/newsletterController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.route('/')
  .get(getNewsletters)
  .post(createNewsletter);

router.route('/type/:type')
  .get(getNewslettersByType);

router.route('/:id')
  .get(getNewsletter)
  .put(updateNewsletter)
  .delete(deleteNewsletter);

router.route('/:id/send')
  .post(sendNewsletter);

module.exports = router;