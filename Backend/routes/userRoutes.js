const express = require('express');
const router = express.Router();
const {
    register,
    login,
    getCurrentUser,
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Auth routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getCurrentUser);

router.route('/')
    .get(getUsers)
    .post(createUser);

router.route('/:id')
    .get(getUserById)
    .put(updateUser)
    .delete(deleteUser);

module.exports = router;
