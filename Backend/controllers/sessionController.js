const Session = require('../models/Session');
const Booking = require('../models/Booking');
const fs = require('fs');
const path = require('path');
const { hasUnlockedContent } = require('../utils/platformStore');

const ALLOWED_PREMIUM_CURRENCIES = ['USD', 'LKR', 'EUR', 'GBP'];

const normalizePremiumCurrency = (currency) => {
  const normalized = String(currency || 'USD').toUpperCase();
  return ALLOWED_PREMIUM_CURRENCIES.includes(normalized) ? normalized : null;
};

/**
 * @desc    Create a new Kuppi session (Tutor only)
 * @route   POST /api/sessions
 * @access  Private (tutor)
 */
const createSession = async (req, res) => {
  try {
    const {
      title,
      subject,
      description,
      date,
      duration,
      maxParticipants,
      meetingLink,
      isPremium,
      premiumPrice,
      premiumCurrency,
    } = req.body;
    let lectureMaterial = undefined;

    if (req.file) {
      lectureMaterial = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: `/uploads/materials/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };
    }

    // Validate that session date is in the future
    if (new Date(date) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Session date must be in the future.' });
    }

    const normalizedIsPremium = String(isPremium).toLowerCase() === 'true' || isPremium === true;
    const normalizedPremiumPrice = Number(premiumPrice ?? 0);
    const normalizedPremiumCurrency = normalizePremiumCurrency(premiumCurrency);

    if (!normalizedPremiumCurrency) {
      return res.status(400).json({
        success: false,
        message: `Invalid premium currency. Allowed values: ${ALLOWED_PREMIUM_CURRENCIES.join(', ')}.`,
      });
    }

    if (normalizedIsPremium && (!Number.isFinite(normalizedPremiumPrice) || normalizedPremiumPrice <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Premium sessions must have a valid price greater than 0.',
      });
    }

    const session = await Session.create({
      title,
      subject,
      description,
      date,
      duration,
      maxParticipants,
      meetingLink,
      lectureMaterial,
      isPremium: normalizedIsPremium,
      premiumPrice: normalizedIsPremium ? normalizedPremiumPrice : 0,
      premiumCurrency: normalizedPremiumCurrency,
      tutor: req.user.id,
    });

    await session.populate('tutor', 'name email profilePicture');

    res.status(201).json({ success: true, message: 'Session created successfully.', session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all upcoming sessions (with optional filters)
 * @route   GET /api/sessions
 * @access  Private
 */
const getSessions = async (req, res) => {
  try {
    const { subject, search, page = 1, limit = 10 } = req.query;

    const query = { status: 'upcoming', date: { $gte: new Date() } };

    if (subject) query.subject = { $regex: subject, $options: 'i' };
    if (search) query.title = { $regex: search, $options: 'i' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [sessions, total] = await Promise.all([
      Session.find(query)
        .populate('tutor', 'name email profilePicture bio')
        .sort({ date: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Session.countDocuments(query),
    ]);

    let serializedSessions = sessions.map((session) => session.toObject());
    if (req.user?.role === 'student') {
      serializedSessions = await Promise.all(
        serializedSessions.map(async (session) => {
          if (!session.isPremium) {
            return { ...session, hasPremiumAccess: true };
          }

          const hasAccess = await hasUnlockedContent({
            studentId: req.user.id,
            itemId: `kuppi-premium-${session._id.toString()}`,
          });

          return { ...session, hasPremiumAccess: hasAccess };
        })
      );
    }

    res.json({
      success: true,
      count: serializedSessions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      sessions: serializedSessions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single session by ID
 * @route   GET /api/sessions/:id
 * @access  Private
 */
const getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('tutor', 'name email profilePicture bio subjects')
      .populate('participants', 'name email profilePicture');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    // Check if current user has booked this session
    let isBooked = false;
    let hasPremiumAccess = !session.isPremium;
    if (req.user.role === 'student') {
      const booking = await Booking.findOne({ student: req.user.id, session: session._id, status: 'confirmed' });
      isBooked = !!booking;
      if (session.isPremium) {
        hasPremiumAccess = await hasUnlockedContent({
          studentId: req.user.id,
          itemId: `kuppi-premium-${session._id.toString()}`,
        });
      }
    }

    const sessionPayload = session.toObject();
    if (req.user.role === 'student') {
      sessionPayload.hasPremiumAccess = hasPremiumAccess;
    }

    res.json({ success: true, session: sessionPayload, isBooked, hasPremiumAccess });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get sessions created by the logged-in tutor
 * @route   GET /api/sessions/my-sessions
 * @access  Private (tutor)
 */
const getTutorSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ tutor: req.user.id })
      .populate('participants', 'name email profilePicture')
      .sort({ date: -1 });

    res.json({ success: true, count: sessions.length, sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update session details (tutor only, own sessions)
 * @route   PUT /api/sessions/:id
 * @access  Private (tutor)
 */
const updateSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    if (session.tutor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this session.' });
    }

    const {
      title,
      subject,
      description,
      date,
      duration,
      maxParticipants,
      meetingLink,
      status,
      isPremium,
      premiumPrice,
      premiumCurrency,
    } = req.body;
    const updatePayload = {
      title,
      subject,
      description,
      date,
      duration,
      maxParticipants,
      meetingLink,
      status,
    };

    const hasPremiumFlags = typeof isPremium !== 'undefined' || typeof premiumPrice !== 'undefined' || typeof premiumCurrency !== 'undefined';
    if (hasPremiumFlags) {
      const nextIsPremium = typeof isPremium === 'undefined'
        ? session.isPremium
        : String(isPremium).toLowerCase() === 'true' || isPremium === true;
      const nextPremiumPrice = typeof premiumPrice === 'undefined' ? Number(session.premiumPrice || 0) : Number(premiumPrice);
      const nextPremiumCurrency = normalizePremiumCurrency(premiumCurrency || session.premiumCurrency || 'USD');

      if (!nextPremiumCurrency) {
        return res.status(400).json({
          success: false,
          message: `Invalid premium currency. Allowed values: ${ALLOWED_PREMIUM_CURRENCIES.join(', ')}.`,
        });
      }

      if (nextIsPremium && (!Number.isFinite(nextPremiumPrice) || nextPremiumPrice <= 0)) {
        return res.status(400).json({
          success: false,
          message: 'Premium sessions must have a valid price greater than 0.',
        });
      }

      updatePayload.isPremium = nextIsPremium;
      updatePayload.premiumPrice = nextIsPremium ? nextPremiumPrice : 0;
      updatePayload.premiumCurrency = nextPremiumCurrency;
    }

    if (req.file) {
      const previousFilename = session.lectureMaterial?.filename;
      updatePayload.lectureMaterial = {
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: `/uploads/materials/${req.file.filename}`,
        mimeType: req.file.mimetype,
        size: req.file.size,
      };

      if (previousFilename && previousFilename !== req.file.filename) {
        const candidates = [
          path.join(__dirname, '..', 'uploads', 'materials', previousFilename),
          path.join(__dirname, '..', 'uploads', 'courses', previousFilename),
        ];
        candidates.forEach((filePath) => {
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (_) {
              // Ignore file cleanup errors and keep update flow successful.
            }
          }
        });
      }
    }

    // Cannot reduce maxParticipants below current participant count
    if (maxParticipants && Number(maxParticipants) < session.participants.length) {
      return res.status(400).json({
        success: false,
        message: `Cannot reduce max participants below current bookings (${session.participants.length}).`,
      });
    }

    const updated = await Session.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true, runValidators: true }
    ).populate('tutor', 'name email profilePicture');

    res.json({ success: true, message: 'Session updated successfully.', session: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a session (tutor only, own sessions)
 * @route   DELETE /api/sessions/:id
 * @access  Private (tutor)
 */
const deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    if (session.tutor.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this session.' });
    }

    // Also remove all related bookings
    await Booking.deleteMany({ session: session._id });
    await session.deleteOne();

    res.json({ success: true, message: 'Session deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createSession, getSessions, getSessionById, getTutorSessions, updateSession, deleteSession };
