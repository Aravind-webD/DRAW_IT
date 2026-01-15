import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import { protect, generateToken, setTokenCookie } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array().map(e => e.msg)
        });
    }
    next();
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
    body('name')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters')
], handleValidation, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already registered'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password
        });

        // Generate token
        const token = generateToken(user._id);
        setTokenCookie(res, token);

        res.status(201).json({
            success: true,
            token,
            user: user.toPublicJSON()
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({
            success: false,
            error: 'Registration failed'
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
], handleValidation, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user and include password
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        // Update last active
        user.lastActive = new Date();
        await user.save({ validateBeforeSave: false });

        // Generate token
        const token = generateToken(user._id);
        setTokenCookie(res, token);

        res.json({
            success: true,
            token,
            user: user.toPublicJSON()
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            success: false,
            error: 'Login failed'
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user.toPublicJSON()
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to get user'
        });
    }
});

// @route   PUT /api/auth/me
// @desc    Update current user
// @access  Private
router.put('/me', protect, [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('avatarColor')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/)
        .withMessage('Invalid color format')
], handleValidation, async (req, res) => {
    try {
        const { name, avatarColor } = req.body;

        if (name) req.user.name = name;
        if (avatarColor) req.user.avatarColor = avatarColor;

        await req.user.save();

        res.json({
            success: true,
            user: req.user.toPublicJSON()
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to update user'
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, (req, res) => {
    res.cookie('token', '', {
        expires: new Date(0),
        httpOnly: true
    });

    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put('/password', protect, [
    body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('New password must be at least 6 characters')
], handleValidation, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Get user with password
        const user = await User.findById(req.user._id).select('+password');

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Current password is incorrect'
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        // Generate new token
        const token = generateToken(user._id);
        setTokenCookie(res, token);

        res.json({
            success: true,
            message: 'Password updated successfully',
            token
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to update password'
        });
    }
});

export default router;
