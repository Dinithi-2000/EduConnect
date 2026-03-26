const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');
const crypto = require('crypto');
const { sendPasswordResetEmail, sendAccountCreationEmail } = require('../utils/emailService');

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
const STRONG_PASSWORD_MESSAGE = 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.';

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
                message: STRONG_PASSWORD_MESSAGE
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
            role: role || 'student'
        });

        // Generate token
        const token = generateToken(user._id);

        // Send welcome email in background (do not block registration)
        sendAccountCreationEmail(user).catch((err) => {
            console.error('Failed to send account creation email:', err.message);
        });

        // Return user data (excluding password) and token
        const userData = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        };

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: userData,
            token
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

// @desc    Request password reset link
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Please provide your email.'
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.json({
                success: true,
                message: 'If an account exists for that email, a reset link has been sent.'
            });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

        user.resetPasswordToken = resetTokenHash;
        user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
        await user.save({ validateBeforeSave: false });

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;
        const emailConfigured = !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);

        await sendPasswordResetEmail(user, resetUrl);

        return res.json({
            success: true,
            message: emailConfigured
                ? 'If an account exists for that email, a reset link has been sent.'
                : 'Email service is not configured. Use the reset link below for local testing.',
            ...(emailConfigured || process.env.NODE_ENV === 'production' ? {} : { resetUrl })
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to process password reset request.',
            error: error.message
        });
    }
};

// @desc    Reset password using token
// @route   POST /api/users/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { password, confirmPassword } = req.body;

        if (!password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide password and confirm password.'
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: 'Passwords do not match.'
            });
        }

        if (!STRONG_PASSWORD_REGEX.test(password)) {
            return res.status(400).json({
                success: false,
                message: STRONG_PASSWORD_MESSAGE
            });
        }

        const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken: resetTokenHash,
            resetPasswordExpire: { $gt: Date.now() }
        }).select('+password');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Reset token is invalid or has expired.'
            });
        }

        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        return res.json({
            success: true,
            message: 'Password reset successful. You can now log in.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Failed to reset password.',
            error: error.message
        });
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword,
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
};
