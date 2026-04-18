const express = require('express');
const {
  createContactMessage,
  getMyContactMessages,
  getAllContactMessages,
  replyToContactMessage,
  deleteContactMessage,
} = require('../controllers/contactController');
const { protect, authorize } = require('../middleware/auth');
const { uploadContactAttachment } = require('../middleware/upload');

const router = express.Router();

router.use(protect);

router.post('/', uploadContactAttachment.array('attachments', 5), createContactMessage);
router.get('/my', getMyContactMessages);

router.get('/admin/messages', authorize('admin', 'teacher'), getAllContactMessages);
router.put('/admin/messages/:id/reply', authorize('admin', 'teacher'), replyToContactMessage);
router.delete('/admin/messages/:id', authorize('admin', 'teacher'), deleteContactMessage);

module.exports = router;
