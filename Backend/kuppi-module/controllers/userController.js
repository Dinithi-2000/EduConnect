const User = require('../models/User');
const path = require('path');
const fs = require('fs');

/**
 * @desc    Get user profile by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update user profile (bio, subjects)
 * @route   PUT /api/users/profile
 * @access  Private
 */
const updateProfile = async (req, res) => {
  try {
    const { name, bio, subjects } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (bio !== undefined) updateData.bio = bio;
    if (subjects !== undefined) {
      // Accept subjects as comma-separated string or array
      updateData.subjects = Array.isArray(subjects)
        ? subjects
        : subjects.split(',').map((s) => s.trim()).filter(Boolean);
    }

    // Handle profile picture upload
    if (req.file) {
      // Delete old picture if exists
      const currentUser = await User.findById(req.user.id);
      if (currentUser.profilePicture) {
        const oldPath = path.join(__dirname, '..', currentUser.profilePicture.replace('/uploads', 'uploads'));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      updateData.profilePicture = `/uploads/profiles/${req.file.filename}`;
    }

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json({ success: true, message: 'Profile updated successfully.', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all tutors (for student browsing)
 * @route   GET /api/users/tutors
 * @access  Private
 */
const getTutors = async (req, res) => {
  try {
    const tutors = await User.find({ role: 'tutor' }).select('-password');
    res.json({ success: true, count: tutors.length, tutors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getUserProfile, updateProfile, getTutors };
