const express = require('express');
const router = express.Router();
const {
    register,
    login,
    forgotPassword,
    resetPassword,
    getCurrentUser,
    updateProfile,
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/uploadMiddleware');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getCurrentUser);
router.put('/profile', protect, upload.single('profilePicture'), updateProfile);

router.route('/')
    .get(getUsers)
    .post(createUser);

router.route('/:id([0-9a-fA-F]{24})')
    .get(getUserById)
    .put(updateUser)
    .delete(deleteUser);

module.exports = router;
