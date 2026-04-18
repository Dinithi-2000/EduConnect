const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const ContactMessage = require('../models/ContactMessage');
const { sendContactReplyEmail } = require('../utils/emailService');

const parseLimit = (value, fallback = 20, max = 100) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), max);
};

const parseSkip = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
};

const createContactMessage = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized user context.' });
    }

    const payload = req.body || {};
    const name = String(payload.name || req.user?.name || '').trim();
    const email = String(payload.email || req.user?.email || '').trim().toLowerCase();
    const subject = String(payload.subject || '').trim();
    const message = String(payload.message || '').trim();
    const uploadedFiles = Array.isArray(req.files) ? req.files : [];

    const attachments = uploadedFiles.map((file) => ({
      url: `${req.protocol}://${req.get('host')}/uploads/contact/${file.filename}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, subject, and message are required.',
      });
    }

    const created = await ContactMessage.create({
      user: userId,
      name,
      email,
      subject,
      message,
      attachments,
    });

    return res.status(201).json({
      success: true,
      message: 'Contact message submitted successfully.',
      data: created,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getMyContactMessages = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(401).json({ success: false, message: 'Unauthorized user context.' });
    }

    const messages = await ContactMessage.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      count: messages.length,
      data: messages,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllContactMessages = async (req, res) => {
  try {
    const limit = parseLimit(req.query.limit);
    const skip = parseSkip(req.query.skip);
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const search = String(req.query.search || '').trim();

    const filter = {};
    if (status === 'open' || status === 'replied') {
      filter.status = status;
    }

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { name: regex },
        { email: regex },
        { subject: regex },
        { message: regex },
      ];
    }

    const [messages, total] = await Promise.all([
      ContactMessage.find(filter)
        .populate('user', 'name email role')
        .populate('adminReply.repliedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ContactMessage.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      count: messages.length,
      total,
      limit,
      skip,
      data: messages,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const replyToContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user?._id;
    const replyMessage = String(req.body?.reply || '').trim();

    if (!replyMessage) {
      return res.status(400).json({ success: false, message: 'Reply message is required.' });
    }

    const message = await ContactMessage.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Contact message not found.' });
    }

    message.adminReply = {
      message: replyMessage,
      repliedBy: adminId,
      repliedAt: new Date(),
    };
    message.status = 'replied';

    await message.save();
    await message.populate('adminReply.repliedBy', 'name email role');

    // Keep API response successful even if email delivery fails.
    sendContactReplyEmail({
      student: {
        name: message.name,
        email: message.email,
      },
      subject: message.subject,
      originalMessage: message.message,
      replyMessage,
    }).catch((err) => {
      console.error('Failed to send contact reply email:', err.message);
    });

    return res.json({
      success: true,
      message: 'Reply sent successfully.',
      data: message,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deleteContactMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const message = await ContactMessage.findById(id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Contact message not found.' });
    }

    const uploadsRoot = path.join(__dirname, '..', 'uploads', 'contact');
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];

    await Promise.all(
      attachments.map(async (file) => {
        const rawUrl = String(file?.url || '');
        const fileName = path.basename(rawUrl.split('?')[0]);
        if (!fileName) return;

        const absolutePath = path.join(uploadsRoot, fileName);
        try {
          await fs.promises.unlink(absolutePath);
        } catch {
          // Ignore missing files while deleting a message record.
        }
      })
    );

    await ContactMessage.deleteOne({ _id: id });

    return res.json({
      success: true,
      message: 'Contact message deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createContactMessage,
  getMyContactMessages,
  getAllContactMessages,
  replyToContactMessage,
  deleteContactMessage,
};
