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
  .post(protect, authorize('admin', 'editor'), upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
  ]), createNewsletter);

router.route('/type/:type')
  .get(getNewslettersByType);

router.route('/:id')
  .get(getNewsletter)
  .put(protect, authorize('admin', 'editor'), upload.fields([
    { name: 'featuredImage', maxCount: 1 },
    { name: 'gallery', maxCount: 10 }
  ]), updateNewsletter)
  .delete(protect, authorize('admin', 'editor'), deleteNewsletter);

router.route('/:id/send')
  .post(protect, authorize('admin', 'editor'), sendNewsletter);

module.exports = router;