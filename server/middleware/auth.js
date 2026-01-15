import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - require authentication
export const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        // Check for token in cookies
        else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized - no token provided'
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token
            const user = await User.findById(decoded.id);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Update last active
            user.lastActive = new Date();
            await user.save({ validateBeforeSave: false });

            // Attach user to request
            req.user = user;
            next();
        } catch (err) {
            return res.status(401).json({
                success: false,
                error: 'Not authorized - invalid token'
            });
        }
    } catch (err) {
        next(err);
    }
};

// Optional authentication - attach user if token exists
export const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.cookies?.token) {
            token = req.cookies.token;
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id);
                if (user) {
                    req.user = user;
                }
            } catch (err) {
                // Token invalid, but continue without user
            }
        }

        next();
    } catch (err) {
        next(err);
    }
};

// Admin only
export const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Admin access required'
        });
    }
    next();
};

// Generate JWT token
export const generateToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

// Set token cookie
export const setTokenCookie = (res, token) => {
    const cookieOptions = {
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    };

    res.cookie('token', token, cookieOptions);
};
