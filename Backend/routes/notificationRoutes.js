const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  trackStudyActivity,
  getSmartReminderSettings,
  updateSmartReminderSettings,
  getSmartReminderInsights,
  getAdminSmartReminderOverview,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getNotifications);
router.post('/smart-reminder/activity', protect, trackStudyActivity);
router.get('/smart-reminder/settings', protect, getSmartReminderSettings);
router.put('/smart-reminder/settings', protect, updateSmartReminderSettings);
router.get('/smart-reminder/insights', protect, getSmartReminderInsights);
router.get('/smart-reminder/admin-overview', protect, getAdminSmartReminderOverview);
router.put('/mark-all-read', protect, markAllAsRead);
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;
