const express = require('express');
const router = express.Router();
const { getUserProfile, updateProfile, getTutors } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/tutors', protect, getTutors);
router.get('/:id', protect, getUserProfile);
router.put('/profile', protect, upload.single('profilePicture'), updateProfile);

module.exports = router;
