const cron = require('node-cron');
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendReminderEmail } = require('./emailService');
const { runSmartReminderSweep } = require('./smartReminderService');

/**
 * Cron job: runs every hour
 * Finds sessions starting within the next 2–6 hours
 * Sends in-app notifications + emails to all participants and the tutor
 * Marks sessions as reminderSent to prevent duplicate reminders
 */
const startReminderCron = () => {
  // Runs every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('🕐 Running session reminder cron job...');

    try {
      const now = new Date();
      const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);

      // Find upcoming sessions within 2–6 hour window that haven't had reminders sent
      const sessions = await Session.find({
        status: 'upcoming',
        date: { $gte: twoHoursLater, $lte: sixHoursLater },
        reminderSent: false,
      }).populate('tutor', 'name email').populate('participants', 'name email');

      console.log(`📅 Found ${sessions.length} session(s) needing reminders.`);

      for (const session of sessions) {
        const allRecipients = [
          // Include tutor
          { user: session.tutor, role: 'tutor' },
          // Include all participants (students)
          ...session.participants.map((p) => ({ user: p, role: 'student' })),
        ];

        const notificationPromises = [];
        const emailPromises = [];

        for (const { user, role } of allRecipients) {
          if (!user || !user._id) continue;

          const message =
            role === 'tutor'
              ? `Reminder: Your session "${session.title}" starts in less than 6 hours.`
              : `Reminder: "${session.title}" that you booked starts in less than 6 hours.`;

          // Queue in-app notification creation
          notificationPromises.push(
            Notification.create({
              recipient: user._id,
              type: 'session_reminder',
              title: '⏰ Session Reminder',
              message,
              relatedSession: session._id,
            })
          );

          // Queue email (non-blocking, errors won't fail the cron)
          emailPromises.push(
            sendReminderEmail(user, session).catch((err) =>
              console.error(`Email reminder failed for ${user.email}:`, err.message)
            )
          );
        }

        // Execute all notifications in parallel
        await Promise.all(notificationPromises);
        // Fire emails without awaiting (non-blocking)
        Promise.all(emailPromises);

        // Mark session so reminders aren't sent again
        session.reminderSent = true;
        await session.save();

        console.log(`✅ Reminders sent for session: "${session.title}"`);
      }

      console.log('✅ Reminder cron job complete.');
    } catch (error) {
      console.error('❌ Reminder cron job error:', error.message);
    }
  });

  console.log('⏰ Session reminder cron job scheduled (runs every hour).');
};

/**
 * Cron job: runs every hour at minute 15
 * Evaluates smart study reminders based on user activity and progress signals.
 */
const startSmartReminderCron = () => {
  cron.schedule('15 * * * *', async () => {
    try {
      console.log('🧠 Running smart reminder cron job...');
      const result = await runSmartReminderSweep();
      console.log(
        `✅ Smart reminder sweep complete. Students=${result.scannedStudents}, inactive=${result.inactive}, deadlines=${result.deadline}, behind=${result.behind}, streak=${result.streak}`
      );
    } catch (error) {
      console.error('❌ Smart reminder cron job error:', error.message);
    }
  });

  console.log('⏰ Smart reminder cron job scheduled (runs every hour at :15).');
};

module.exports = { startReminderCron, startSmartReminderCron };
