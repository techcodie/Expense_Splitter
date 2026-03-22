const authService = require('../services/auth.service');

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        // Basic validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide name, email, and password',
            });
        }

        const { user, token } = await authService.register({ name, email, password });

        res.status(201).json({
            success: true,
            data: { user, token },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Please provide email and password',
            });
        }

        const { user, token } = await authService.login({ email, password });

        res.status(200).json({
            success: true,
            data: { user, token },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/auth/me  (protected)
 */
const getMe = async (req, res, next) => {
    try {
        const user = await authService.getMe(req.user.id);

        res.status(200).json({
            success: true,
            data: { user },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login, getMe };