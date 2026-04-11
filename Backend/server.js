const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB connected successfully');
    // Start Kuppi cron jobs after DB is connected
    require('./utils/cronJobs');
})
.catch((err) => console.error('MongoDB connection error:', err));

// ── Team's Routes ─────────────────────────────────────
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/commerce', require('./routes/commerceRoutes'));
app.use('/api/quizzes', require('./routes/quizRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/community', require('./routes/communityRoutes'));
app.use('/api/study-items', require('./routes/studyItemRoutes'));

// ── Kuppi Module Routes ───────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ message: 'EduConnect API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack || err);

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                message: 'Image is too large. Max allowed size is 12MB per image.'
            });
        }

        return res.status(400).json({
            success: false,
            message: err.message || 'Upload failed.'
        });
    }

    if (err.message === 'Only image files are allowed') {
        return res.status(400).json({
            success: false,
            message: 'Only image files are allowed.'
        });
    }

    return res.status(500).json({
        success: false,
        message: 'Something went wrong!',
        error: err.message
    });
});

const basePort = Number(process.env.PORT) || 5000;
const startServer = (port) => {
    const server = app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
    server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            const fallbackPort = port + 1;
            console.warn(`Port ${port} is already in use. Retrying on port ${fallbackPort}...`);
            startServer(fallbackPort);
            return;
        }
        throw error;
    });
};
startServer(basePort);