const nodemailer = require('nodemailer');

/**
 * Create reusable transporter using SMTP credentials from .env
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for port 465
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Base HTML email template wrapper
 */
const emailTemplate = (title, bodyHtml) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .body { padding: 32px; color: #374151; line-height: 1.6; }
    .info-box { background: #f0f4ff; border-left: 4px solid #2563eb; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .info-box p { margin: 4px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; }
    .btn { display: inline-block; background: #2563eb; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🎓 Kuppi LMS</h1></div>
    <div class="body">
      <h2>${title}</h2>
      ${bodyHtml}
    </div>
    <div class="footer">© ${new Date().getFullYear()} Kuppi LMS. All rights reserved.</div>
  </div>
</body>
</html>
`;

/**
 * Send booking confirmation email to student
 */
const sendBookingConfirmationEmail = async (student, session) => {
  if (!process.env.EMAIL_USER) {
    console.log('Email service not configured. Skipping booking confirmation email.');
    return;
  }

  const transporter = createTransporter();
  const sessionDate = new Date(session.date).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const html = emailTemplate(
    'Booking Confirmed!',
    `
    <p>Hi <strong>${student.name}</strong>,</p>
    <p>Your session has been successfully booked. Here are the details:</p>
    <div class="info-box">
      <p><strong>📚 Session:</strong> ${session.title}</p>
      <p><strong>📖 Subject:</strong> ${session.subject}</p>
      <p><strong>📅 Date & Time:</strong> ${sessionDate}</p>
      <p><strong>⏱ Duration:</strong> ${session.duration} minutes</p>
      <p><strong>👨‍🏫 Tutor:</strong> ${session.tutor?.name || 'N/A'}</p>
      ${session.meetingLink ? `<p><strong>🔗 Meeting Link:</strong> <a href="${session.meetingLink}">${session.meetingLink}</a></p>` : ''}
    </div>
    <p>We look forward to seeing you there! Good luck with your studies.</p>
  `
  );

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Kuppi LMS <noreply@kuppilms.com>',
    to: student.email,
    subject: `✅ Booking Confirmed: ${session.title}`,
    html,
  });

  console.log(`📧 Booking confirmation sent to ${student.email}`);
};

/**
 * Send session reminder email
 */
const sendReminderEmail = async (user, session) => {
  if (!process.env.EMAIL_USER) {
    console.log('Email service not configured. Skipping reminder email.');
    return;
  }

  const transporter = createTransporter();
  const sessionDate = new Date(session.date).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const hoursUntil = Math.round((new Date(session.date) - new Date()) / (1000 * 60 * 60));

  const html = emailTemplate(
    `⏰ Session Reminder — Starting in ~${hoursUntil} hours`,
    `
    <p>Hi <strong>${user.name}</strong>,</p>
    <p>This is a friendly reminder that your upcoming Kuppi session starts soon!</p>
    <div class="info-box">
      <p><strong>📚 Session:</strong> ${session.title}</p>
      <p><strong>📖 Subject:</strong> ${session.subject}</p>
      <p><strong>📅 Date & Time:</strong> ${sessionDate}</p>
      <p><strong>⏱ Duration:</strong> ${session.duration} minutes</p>
      ${session.meetingLink ? `<p><strong>🔗 Join Link:</strong> <a href="${session.meetingLink}" class="btn">Join Session</a></p>` : ''}
    </div>
    <p>Make sure you're prepared and ready on time. Best of luck!</p>
  `
  );

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'Kuppi LMS <noreply@kuppilms.com>',
    to: user.email,
    subject: `⏰ Reminder: "${session.title}" starts in ~${hoursUntil} hours`,
    html,
  });

  console.log(`📧 Reminder sent to ${user.email}`);
};

module.exports = { sendBookingConfirmationEmail, sendReminderEmail };
