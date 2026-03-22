const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate a signed JWT for a given user ID.
 */
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
};

/**
 * Register a new user.
 * @returns {{ user, token }}
 */
const register = async ({ name, email, password }) => {
    // Check for existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        const error = new Error('Email already in use');
        error.statusCode = 400;
        throw error;
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    return { user, token };
};

/**
 * Authenticate an existing user.
 * @returns {{ user, token }}
 */
const login = async ({ email, password }) => {
    // Find user and explicitly include password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        const error = new Error('Invalid email or password');
        error.statusCode = 401;
        throw error;
    }

    const token = generateToken(user._id);

    // Strip password before returning
    user.password = undefined;

    return { user, token };
};

/**
 * Get user by ID (for /me endpoint).
 */
const getMe = async (userId) => {
    const user = await User.findById(userId);
    if (!user) {
        const error = new Error('User not found');
        error.statusCode = 404;
        throw error;
    }
    return user;
};

module.exports = { register, login, getMe, generateToken };