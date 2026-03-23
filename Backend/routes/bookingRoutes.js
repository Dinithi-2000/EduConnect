const express = require('express');
const router = express.Router();
const { bookSession, cancelBooking, getMyBookings } = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/my-bookings', protect, authorize('student'), getMyBookings);
router.post('/:sessionId', protect, authorize('student'), bookSession);
router.delete('/:sessionId', protect, authorize('student'), cancelBooking);

module.exports = router;
