const User = require('../models/User');
const crypto = require('crypto');
const { generateToken } = require('../utils/generateToken');
const { sendAccountCreationEmail, sendPasswordResetEmail } = require('../utils/emailService');

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const toSubjectArray = (subjects) => {
    if (Array.isArray(subjects)) {
        return subjects
            .map((item) => String(item || '').trim())
            .filter(Boolean);
    }

    if (typeof subjects === 'string') {
        return subjects
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }

    return [];
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide name, email, and password'
            });
        }

        if (!STRONG_PASSWORD_REGEX.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
            });
        }

        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create user
        user = await User.create({
            name,
            email,
            password,
            role: role || 'student',
            isEmailVerified: true
        });

        sendAccountCreationEmail(user).catch((err) => {
            console.error('Failed to send account creation email:', err.message);
        });

        res.status(201).json({
            success: true,
            message: 'Account created successfully.'
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Registration failed',
            error: error.message
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password'
            });
        }

        // Check for user (include password field)
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Generate token
        const token = generateToken(user._id);

        // Return user data (excluding password) and token
        const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt
        };

        res.json({
            success: true,
            message: 'Login successful',
            user: userData,
            token
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

// @desc    Send password reset email
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide an email address'
            });
        }

        const user = await User.findOne({ email });

        // Respond with a generic message to avoid leaking account existence.
        if (!user) {
            return res.json({
                success: true,
                message: 'If this email is registered, a reset link has been sent to your inbox.'
            });
        }

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        user.passwordResetTokenHash = tokenHash;
        user.passwordResetExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await user.save({ validateBeforeSave: false });

        const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${rawToken}`;

        try {
            await sendPasswordResetEmail(user, resetUrl);
        } catch (emailError) {
            user.passwordResetTokenHash = null;
            user.passwordResetExpiresAt = null;
            await user.save({ validateBeforeSave: false });

            console.error('Failed to send password reset email:', emailError.message);
            return res.status(500).json({
                success: false,
                message: 'Unable to send password reset email right now. Please try again later.'
            });
        }

        return res.json({
            success: true,
            message: 'If this email is registered, a reset link has been sent to your inbox.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to process password reset request',
            error: error.message
        });
    }
};

// @desc    Reset password using token
// @route   POST /api/users/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const token = String(req.body?.token || '').trim();
        const password = String(req.body?.password || '');

        if (!token || !password) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required'
            });
        }

        if (!STRONG_PASSWORD_REGEX.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.'
            });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            passwordResetTokenHash: tokenHash,
            passwordResetExpiresAt: { $gt: new Date() }
        }).select('+password');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Reset token is invalid or has expired'
            });
        }

        user.password = password;
        user.passwordResetTokenHash = null;
        user.passwordResetExpiresAt = null;
        await user.save();

        return res.json({
            success: true,
            message: 'Password reset successful. You can now log in with your new password.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to reset password',
            error: error.message
        });
    }
};

// @desc    Get current user
// @route   GET /api/users/me
// @access  Private
const getCurrentUser = async (req, res) => {
    try {
        if (!req.user?._id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const user = await User.findById(req.user._id)
            .select('_id name email role bio subjects profilePicture createdAt isEmailVerified')
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to load user',
            error: error.message
        });
    }
};

// @desc    Update logged-in user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
    try {
        if (!req.user?._id && !req.user?.id) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized'
            });
        }

        const userId = req.user._id || req.user.id;
        const existingUser = await User.findById(userId);

        if (!existingUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const updatePayload = {};

        if (typeof req.body.name === 'string') {
            updatePayload.name = req.body.name.trim();
        }

        if (typeof req.body.bio === 'string') {
            updatePayload.bio = req.body.bio.trim();
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'subjects')) {
            updatePayload.subjects = toSubjectArray(req.body.subjects);
        }

        if (req.file) {
            updatePayload.profilePicture = `/uploads/profiles/${req.file.filename}`;
        }

        const user = await User.findByIdAndUpdate(userId, updatePayload, {
            new: true,
            runValidators: true
        }).select('_id name email role bio subjects profilePicture createdAt');

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to update profile',
            error: error.message
        });
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Public
const getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Public
const getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Public
const createUser = async (req, res) => {
    try {
        const user = await User.create(req.body);
        
        res.status(201).json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to create user',
            error: error.message
        });
    }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Public
const updateUser = async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Failed to update user',
            error: error.message
        });
    }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Public
const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

module.exports = {
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
};
