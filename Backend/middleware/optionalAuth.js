const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Optional authentication middleware.
 * If a valid Bearer token is present, populates req.user.
 * If the token is absent or invalid, req.user remains undefined and the
 * request continues without error — useful for public endpoints that return
 * richer data to authenticated users (e.g. course detail with progress).
 */
const optionalProtect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');
        } catch (_err) {
            // Token is present but invalid — treat as unauthenticated
        }
    }

    next();
};

module.exports = { optionalProtect };
