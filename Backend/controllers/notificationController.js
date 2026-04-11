const Notification = require('../models/Notification');
const User = require('../models/User');
// Session must be imported so Mongoose registers the schema before populate() resolves 'relatedSession'
const Session = require('../models/Session');
const { evaluateSmartRemindersForUser, daysBetween } = require('../utils/smartReminderService');

/**
 * @desc    Get all notifications for logged-in user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('relatedSession', 'title date')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ recipient: req.user.id, isRead: false });

    res.json({ success: true, count: notifications.length, unreadCount, notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });

    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/mark-all-read
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
    res.json({ success: true, message: 'Notification deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Track study activity for smart reminders
 * @route   POST /api/notifications/smart-reminder/activity
 * @access  Private
 */
const trackStudyActivity = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const now = new Date();
    const incomingProgress = Number(req.body?.progressPercent);
    const incomingDeadlineAt = req.body?.deadlineAt ? new Date(req.body.deadlineAt) : null;

    user.smartReminder = user.smartReminder || {};
    user.smartReminder.preferences = user.smartReminder.preferences || {};

    const lastStreakDate = user.smartReminder.lastStreakDate;
    const lastStudyAt = user.smartReminder.lastStudyAt;

    if (!lastStudyAt) {
      user.smartReminder.studyStreak = 1;
    } else {
      const dayGap = daysBetween(lastStreakDate || lastStudyAt, now);
      if (dayGap === 0) {
        // Keep streak unchanged for multiple activities in same day.
      } else if (dayGap === 1) {
        user.smartReminder.studyStreak = Number(user.smartReminder.studyStreak || 0) + 1;
      } else {
        user.smartReminder.studyStreak = 1;
      }
    }

    user.smartReminder.lastStudyAt = now;
    user.smartReminder.lastStreakDate = now;
    if (!user.smartReminder.firstStudyAt) {
      user.smartReminder.firstStudyAt = now;
    }

    if (!Number.isNaN(incomingProgress) && incomingProgress >= 0 && incomingProgress <= 100) {
      const previous = Number(user.smartReminder.courseProgressPercent || 0);
      user.smartReminder.courseProgressPercent = Math.max(previous, Math.round(incomingProgress));
    }

    if (incomingDeadlineAt && !Number.isNaN(incomingDeadlineAt.getTime()) && incomingDeadlineAt.getTime() > now.getTime()) {
      user.smartReminder.nextDeadlineAt = incomingDeadlineAt;
    }

    await user.save({ validateBeforeSave: false });

    const reminderResult = await evaluateSmartRemindersForUser(user, { now });

    return res.json({
      success: true,
      message: 'Study activity tracked.',
      data: {
        lastStudyAt: user.smartReminder.lastStudyAt,
        courseProgressPercent: user.smartReminder.courseProgressPercent,
        studyStreak: user.smartReminder.studyStreak,
        triggered: reminderResult.triggered,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get smart reminder settings and metrics
 * @route   GET /api/notifications/smart-reminder/settings
 * @access  Private
 */
const getSmartReminderSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('smartReminder createdAt');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const progress = Number(user.smartReminder?.courseProgressPercent || 0);
    const streak = Number(user.smartReminder?.studyStreak || 0);
    const lastStudyAt = user.smartReminder?.lastStudyAt || null;

    return res.json({
      success: true,
      data: {
        preferences: {
          enabled: user.smartReminder?.preferences?.enabled !== false,
          inactivity: user.smartReminder?.preferences?.inactivity !== false,
          deadline: user.smartReminder?.preferences?.deadline !== false,
          lowProgress: user.smartReminder?.preferences?.lowProgress !== false,
          streak: user.smartReminder?.preferences?.streak !== false,
        },
        metrics: {
          lastStudyAt,
          courseProgressPercent: progress,
          studyStreak: streak,
          nextDeadlineAt: user.smartReminder?.nextDeadlineAt || null,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update smart reminder settings
 * @route   PUT /api/notifications/smart-reminder/settings
 * @access  Private
 */
const updateSmartReminderSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const payload = req.body || {};
    const incomingPrefs = payload.preferences || {};

    user.smartReminder = user.smartReminder || {};
    user.smartReminder.preferences = user.smartReminder.preferences || {};

    const keys = ['enabled', 'inactivity', 'deadline', 'lowProgress', 'streak'];
    keys.forEach((key) => {
      if (typeof incomingPrefs[key] === 'boolean') {
        user.smartReminder.preferences[key] = incomingPrefs[key];
      }
    });

    if (payload.nextDeadlineAt) {
      const candidate = new Date(payload.nextDeadlineAt);
      if (!Number.isNaN(candidate.getTime())) {
        user.smartReminder.nextDeadlineAt = candidate;
      }
    }

    await user.save({ validateBeforeSave: false });

    return res.json({
      success: true,
      message: 'Smart reminder settings updated.',
      data: {
        preferences: user.smartReminder.preferences,
        nextDeadlineAt: user.smartReminder.nextDeadlineAt || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get smart reminder insights
 * @route   GET /api/notifications/smart-reminder/insights
 * @access  Private
 */
const getSmartReminderInsights = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('smartReminder createdAt');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const now = new Date();
    const lastStudyAt = user.smartReminder?.lastStudyAt || null;
    const inactivityDays = lastStudyAt ? daysBetween(lastStudyAt, now) : null;
    const courseProgressPercent = Number(user.smartReminder?.courseProgressPercent || 0);
    const studyStreak = Number(user.smartReminder?.studyStreak || 0);

    return res.json({
      success: true,
      data: {
        lastStudyAt,
        inactivityDays,
        courseProgressPercent,
        studyStreak,
        nextDeadlineAt: user.smartReminder?.nextDeadlineAt || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Admin smart reminder overview
 * @route   GET /api/notifications/smart-reminder/admin-overview
 * @access  Private (admin/teacher)
 */
const getAdminSmartReminderOverview = async (req, res) => {
  try {
    if (!['admin', 'teacher'].includes(String(req.user?.role || '').toLowerCase())) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const students = await User.find({ role: 'student' })
      .select('name email smartReminder createdAt')
      .limit(500)
      .lean();

    const now = new Date();
    const overview = {
      totalStudents: students.length,
      inactiveStudents: 0,
      deadlineRiskStudents: 0,
      behindStudents: 0,
      streakStudents: 0,
      items: [],
    };

    for (const student of students) {
      const lastStudyAt = student.smartReminder?.lastStudyAt || null;
      const inactivityDays = lastStudyAt ? daysBetween(lastStudyAt, now) : null;
      const progress = Number(student.smartReminder?.courseProgressPercent || 0);
      const firstStudyAt = student.smartReminder?.firstStudyAt || student.createdAt;
      const trackedDays = Math.max(1, daysBetween(firstStudyAt, now) + 1);
      const expectedProgress = Math.min(100, Math.round(trackedDays * 4));
      const behind = progress + 15 < expectedProgress;
      const streak = Number(student.smartReminder?.studyStreak || 0);

      const nextDeadlineAt = student.smartReminder?.nextDeadlineAt || null;
      const deadlineRisk =
        !!nextDeadlineAt
        && new Date(nextDeadlineAt).getTime() > now.getTime()
        && new Date(nextDeadlineAt).getTime() <= now.getTime() + 24 * 60 * 60 * 1000;

      if (typeof inactivityDays === 'number' && inactivityDays >= 2) overview.inactiveStudents += 1;
      if (deadlineRisk) overview.deadlineRiskStudents += 1;
      if (behind) overview.behindStudents += 1;
      if (streak >= 3) overview.streakStudents += 1;

      if ((typeof inactivityDays === 'number' && inactivityDays >= 2) || deadlineRisk || behind || streak >= 3) {
        overview.items.push({
          id: student._id,
          name: student.name,
          email: student.email,
          inactivityDays,
          courseProgressPercent: progress,
          studyStreak: streak,
          expectedProgress,
          nextDeadlineAt,
        });
      }
    }

    overview.items.sort((a, b) => {
      const aRisk = (a.inactivityDays || 0) + Math.max(0, (a.expectedProgress || 0) - (a.courseProgressPercent || 0));
      const bRisk = (b.inactivityDays || 0) + Math.max(0, (b.expectedProgress || 0) - (b.courseProgressPercent || 0));
      return bRisk - aRisk;
    });

    return res.json({ success: true, data: overview });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  trackStudyActivity,
  getSmartReminderSettings,
  updateSmartReminderSettings,
  getSmartReminderInsights,
  getAdminSmartReminderOverview,
};
