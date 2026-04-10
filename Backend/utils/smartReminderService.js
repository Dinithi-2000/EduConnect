const Notification = require('../models/Notification');
const Session = require('../models/Session');
const User = require('../models/User');

const DAY_MS = 24 * 60 * 60 * 1000;

const toDateOnlyTs = (date) => {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const daysBetween = (from, to) => {
  const start = toDateOnlyTs(from);
  const end = toDateOnlyTs(to);
  if (start === null || end === null) return 0;
  return Math.floor((end - start) / DAY_MS);
};

const canSendAfterHours = (lastSentAt, now, hours) => {
  if (!lastSentAt) return true;
  return now.getTime() - new Date(lastSentAt).getTime() >= hours * 60 * 60 * 1000;
};

const createNotificationSafe = async ({ recipient, type, title, message, metadata = {} }) => {
  await Notification.create({ recipient, type, title, message, metadata });
};

const getUpcomingDeadlineForUser = async (user) => {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + DAY_MS);

  const sessionDeadline = await Session.findOne({
    status: 'upcoming',
    participants: user._id,
    date: { $gte: now, $lte: in24Hours },
  })
    .sort({ date: 1 })
    .select('_id title date')
    .lean();

  const customDeadline = user.smartReminder?.nextDeadlineAt;
  const customInRange =
    customDeadline && new Date(customDeadline).getTime() >= now.getTime() && new Date(customDeadline).getTime() <= in24Hours.getTime();

  if (sessionDeadline && customInRange) {
    return new Date(sessionDeadline.date).getTime() <= new Date(customDeadline).getTime()
      ? { type: 'session', id: sessionDeadline._id, at: sessionDeadline.date, title: sessionDeadline.title }
      : { type: 'custom', at: customDeadline, title: 'Course deadline' };
  }

  if (sessionDeadline) {
    return { type: 'session', id: sessionDeadline._id, at: sessionDeadline.date, title: sessionDeadline.title };
  }

  if (customInRange) {
    return { type: 'custom', at: customDeadline, title: 'Course deadline' };
  }

  return null;
};

const evaluateSmartRemindersForUser = async (userDoc, options = {}) => {
  const now = options.now || new Date();
  const user = userDoc;

  if (!user || user.role !== 'student') {
    return { triggered: [] };
  }

  const prefs = {
    enabled: user.smartReminder?.preferences?.enabled !== false,
    inactivity: user.smartReminder?.preferences?.inactivity !== false,
    deadline: user.smartReminder?.preferences?.deadline !== false,
    lowProgress: user.smartReminder?.preferences?.lowProgress !== false,
    streak: user.smartReminder?.preferences?.streak !== false,
  };

  if (!prefs.enabled) {
    return { triggered: [] };
  }

  const reminders = [];
  const reminderState = user.smartReminder?.lastReminderAt || {};

  const inactivityDays = user.smartReminder?.lastStudyAt ? daysBetween(user.smartReminder.lastStudyAt, now) : null;
  if (
    prefs.inactivity
    && typeof inactivityDays === 'number'
    && inactivityDays >= 2
    && canSendAfterHours(reminderState.inactivity, now, 24)
  ) {
    reminders.push({
      key: 'inactivity',
      type: 'smart_reminder_inactivity',
      title: '📚 Study Reminder',
      message: 'You didn\'t study for 2 days 😅 Let\'s continue your course!',
      metadata: { inactivityDays },
    });
  }

  if (prefs.deadline && canSendAfterHours(reminderState.deadline, now, 12)) {
    const deadline = await getUpcomingDeadlineForUser(user);
    if (deadline) {
      reminders.push({
        key: 'deadline',
        type: 'smart_reminder_deadline',
        title: '⏰ Deadline Alert',
        message: 'Your deadline is tomorrow! Finish your lesson now ⏰',
        metadata: {
          deadlineType: deadline.type,
          deadlineAt: deadline.at,
          sessionId: deadline.id || null,
          sourceTitle: deadline.title,
        },
      });
    }
  }

  const progress = Number(user.smartReminder?.courseProgressPercent || 0);
  const firstStudyAt = user.smartReminder?.firstStudyAt || user.createdAt;
  const trackedDays = Math.max(1, daysBetween(firstStudyAt, now) + 1);
  const expectedProgress = Math.min(100, Math.round(trackedDays * 4));
  const isBehind = progress + 15 < expectedProgress;

  if (prefs.lowProgress && isBehind && canSendAfterHours(reminderState.lowProgress, now, 24)) {
    reminders.push({
      key: 'lowProgress',
      type: 'smart_reminder_low_progress',
      title: '🚀 Progress Nudge',
      message: 'You are falling behind. Complete at least 1 lesson today 💪',
      metadata: { progress, expectedProgress, trackedDays },
    });
  }

  const streak = Number(user.smartReminder?.studyStreak || 0);
  if (prefs.streak && streak >= 3 && canSendAfterHours(reminderState.streak, now, 24)) {
    reminders.push({
      key: 'streak',
      type: 'smart_reminder_streak',
      title: '🔥 Streak Reward',
      message: 'Great job! Keep your streak going 🔥',
      metadata: { streak },
    });
  }

  for (const reminder of reminders) {
    await createNotificationSafe({
      recipient: user._id,
      type: reminder.type,
      title: reminder.title,
      message: reminder.message,
      metadata: reminder.metadata,
    });

    user.smartReminder = user.smartReminder || {};
    user.smartReminder.lastReminderAt = user.smartReminder.lastReminderAt || {};
    user.smartReminder.lastReminderAt[reminder.key] = now;
  }

  if (reminders.length > 0) {
    await user.save({ validateBeforeSave: false });
  }

  return { triggered: reminders.map((item) => item.key), inactivityDays, isBehind };
};

const sendAdminSummaryNotifications = async (summary, now) => {
  const admins = await User.find({ role: { $in: ['admin', 'teacher'] } }).select('_id').lean();
  if (!admins.length) return;

  const hasAny = summary.inactive > 0 || summary.deadline > 0 || summary.behind > 0 || summary.streak > 0;
  if (!hasAny) return;

  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  for (const admin of admins) {
    const alreadySent = await Notification.exists({
      recipient: admin._id,
      type: 'smart_reminder_admin',
      createdAt: { $gte: twoHoursAgo },
    });

    if (alreadySent) continue;

    await createNotificationSafe({
      recipient: admin._id,
      type: 'smart_reminder_admin',
      title: '📣 Smart Reminder Summary',
      message: `Smart reminder update: ${summary.inactive} inactive, ${summary.deadline} deadlines, ${summary.behind} behind, ${summary.streak} streak achievers.`,
      metadata: summary,
    });
  }
};

const runSmartReminderSweep = async () => {
  const now = new Date();
  const students = await User.find({
    role: 'student',
    $or: [
      { 'smartReminder.preferences.enabled': { $exists: false } },
      { 'smartReminder.preferences.enabled': true },
    ],
  });

  const summary = {
    inactive: 0,
    deadline: 0,
    behind: 0,
    streak: 0,
  };

  for (const student of students) {
    const result = await evaluateSmartRemindersForUser(student, { now });
    if (result.triggered.includes('inactivity')) summary.inactive += 1;
    if (result.triggered.includes('deadline')) summary.deadline += 1;
    if (result.triggered.includes('lowProgress')) summary.behind += 1;
    if (result.triggered.includes('streak')) summary.streak += 1;
  }

  await sendAdminSummaryNotifications(summary, now);

  return {
    scannedStudents: students.length,
    ...summary,
  };
};

module.exports = {
  evaluateSmartRemindersForUser,
  runSmartReminderSweep,
  daysBetween,
};
