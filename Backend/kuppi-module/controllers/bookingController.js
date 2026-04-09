const Booking = require('../models/Booking');
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const { sendBookingConfirmationEmail } = require('../utils/emailService');

/**
 * @desc    Book a session (student only)
 * @route   POST /api/bookings/:sessionId
 * @access  Private (student)
 */
const bookSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId).populate('tutor', 'name email');

    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });
    if (session.status !== 'upcoming') {
      return res.status(400).json({ success: false, message: 'This session is no longer available for booking.' });
    }
    if (new Date(session.date) <= new Date()) {
      return res.status(400).json({ success: false, message: 'Cannot book a session that has already started.' });
    }

    // Check for duplicate booking
    const existingBooking = await Booking.findOne({ student: req.user.id, session: session._id });
    if (existingBooking) {
      if (existingBooking.status === 'confirmed') {
        return res.status(409).json({ success: false, message: 'You have already booked this session.' });
      }
      // Re-confirm a cancelled booking
      existingBooking.status = 'confirmed';
      await existingBooking.save();
    }

    // Check if session is full
    if (session.participants.length >= session.maxParticipants) {
      return res.status(400).json({ success: false, message: 'This session is fully booked.' });
    }

    // Create booking if not re-booking
    let booking;
    if (!existingBooking) {
      booking = await Booking.create({ student: req.user.id, session: session._id });
    } else {
      booking = existingBooking;
    }

    // Add student to session participants
    if (!session.participants.includes(req.user.id)) {
      session.participants.push(req.user.id);
      await session.save();
    }

    // --- Notifications ---
    // 1. Notify the student (booking confirmation)
    await Notification.create({
      recipient: req.user.id,
      type: 'booking_confirmed',
      title: 'Booking Confirmed!',
      message: `You have successfully booked "${session.title}" on ${new Date(session.date).toLocaleDateString()}.`,
      relatedSession: session._id,
    });

    // 2. Notify the tutor (student booked their session)
    await Notification.create({
      recipient: session.tutor._id,
      type: 'student_booked',
      title: 'New Booking',
      message: `${req.user.name} has booked your session "${session.title}".`,
      relatedSession: session._id,
    });

    // Send confirmation email (non-blocking)
    sendBookingConfirmationEmail(req.user, session).catch((err) =>
      console.error('Email send error:', err.message)
    );

    await booking.populate(['student', { path: 'session', populate: { path: 'tutor', select: 'name email' } }]);

    res.status(201).json({ success: true, message: 'Session booked successfully!', booking });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'You have already booked this session.' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Cancel a booking (student only)
 * @route   DELETE /api/bookings/:sessionId
 * @access  Private (student)
 */
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({ student: req.user.id, session: req.params.sessionId, status: 'confirmed' });

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    booking.status = 'cancelled';
    await booking.save();

    // Remove student from session participants
    await Session.findByIdAndUpdate(req.params.sessionId, {
      $pull: { participants: req.user.id },
    });

    res.json({ success: true, message: 'Booking cancelled successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get student's booked sessions
 * @route   GET /api/bookings/my-bookings
 * @access  Private (student)
 */
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ student: req.user.id })
      .populate({
        path: 'session',
        populate: { path: 'tutor', select: 'name email profilePicture' },
      })
      .sort({ bookedAt: -1 });

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { bookSession, cancelBooking, getMyBookings };
