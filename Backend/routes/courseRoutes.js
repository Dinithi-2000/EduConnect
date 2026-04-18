const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { getCourseDetail } = require('../controllers/courseController');
const { optionalProtect } = require('../middleware/optionalAuth');

// Apply rate limiting: max 60 requests per 15 minutes per IP
const courseDetailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    }
});

// GET /api/courses/:id
// Public route — authenticated users also receive access flags and progress.
router.get('/:id', courseDetailLimiter, optionalProtect, getCourseDetail);

module.exports = router;
