const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['student', 'teacher', 'admin'],
        default: 'student'
    },
    bio: {
        type: String,
        trim: true,
        default: ''
    },
    subjects: {
        type: [String],
        default: []
    },
    profilePicture: {
        type: String,
        default: ''
    },
    isEmailVerified: {
        type: Boolean,
        default: true
    },
    emailVerificationTokenHash: {
        type: String,
        default: null
    },
    emailVerificationExpiresAt: {
        type: Date,
        default: null
    },
    emailVerifiedAt: {
        type: Date,
        default: null
    },
    passwordResetTokenHash: {
        type: String,
        default: null
    },
    passwordResetExpiresAt: {
        type: Date,
        default: null
    },
    smartReminder: {
        lastStudyAt: {
            type: Date,
            default: null
        },
        firstStudyAt: {
            type: Date,
            default: null
        },
        courseProgressPercent: {
            type: Number,
            min: 0,
            max: 100,
            default: 0
        },
        studyStreak: {
            type: Number,
            min: 0,
            default: 0
        },
        lastStreakDate: {
            type: Date,
            default: null
        },
        nextDeadlineAt: {
            type: Date,
            default: null
        },
        preferences: {
            enabled: {
                type: Boolean,
                default: true
            },
            inactivity: {
                type: Boolean,
                default: true
            },
            deadline: {
                type: Boolean,
                default: true
            },
            lowProgress: {
                type: Boolean,
                default: true
            },
            streak: {
                type: Boolean,
                default: true
            }
        },
        lastReminderAt: {
            inactivity: { type: Date, default: null },
            deadline: { type: Date, default: null },
            lowProgress: { type: Date, default: null },
            streak: { type: Date, default: null }
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
