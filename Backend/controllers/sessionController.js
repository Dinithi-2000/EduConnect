const Session = require('../models/Session');
const Booking = require('../models/Booking');

/**
 * @desc    Create a new Kuppi session (Tutor only)
 * @route   POST /api/sessions
 * @access  Private (tutor)
 */
const createSession = async (req, res) => {
  try {
    const { title, subject, description, date, duration, maxParticipants, meetingLink } = req.body;
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

    const session = await Session.create({
      title,
      subject,
      description,
      date,
      duration,
      maxParticipants,
      meetingLink,
      lectureMaterial,
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

    res.json({
      success: true,
      count: sessions.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      sessions,
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
    if (req.user.role === 'student') {
      const booking = await Booking.findOne({ student: req.user.id, session: session._id, status: 'confirmed' });
      isBooked = !!booking;
    }

    res.json({ success: true, session, isBooked });
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

    const { title, subject, description, date, duration, maxParticipants, meetingLink, status } = req.body;

    // Cannot reduce maxParticipants below current participant count
    if (maxParticipants && maxParticipants < session.participants.length) {
      return res.status(400).json({
        success: false,
        message: `Cannot reduce max participants below current bookings (${session.participants.length}).`,
      });
    }

    const updated = await Session.findByIdAndUpdate(
      req.params.id,
      { title, subject, description, date, duration, maxParticipants, meetingLink, status },
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
