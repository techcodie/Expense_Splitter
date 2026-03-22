const groupService = require('../services/group.service');

/**
 * POST /api/groups
 * Create a new group.
 */
const createGroup = async (req, res, next) => {
    try {
        const { name, password, settlementThreshold } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Group name is required',
            });
        }

        if (
            settlementThreshold !== undefined &&
            (!Number.isInteger(Number(settlementThreshold)) || Number(settlementThreshold) < 0)
        ) {
            return res.status(400).json({
                success: false,
                error: 'Settlement threshold must be a non-negative integer (smallest currency unit)',
            });
        }

        const group = await groupService.createGroup(
            {
                name: name.trim(),
                password,
                settlementThreshold: settlementThreshold ? parseInt(settlementThreshold, 10) : 0,
            },
            req.user.id
        );

        res.status(201).json({
            success: true,
            data: { group },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/groups/join
 * Join a group via joinCode.
 */
const joinGroup = async (req, res, next) => {
    try {
        const { joinCode, password } = req.body;

        if (!joinCode || !joinCode.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Join code is required',
            });
        }

        const group = await groupService.joinGroup(
            { joinCode: joinCode.trim().toUpperCase(), password },
            req.user.id
        );

        res.status(200).json({
            success: true,
            data: { group },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/groups
 * Get all groups for the authenticated user.
 */
const getUserGroups = async (req, res, next) => {
    try {
        const groups = await groupService.getUserGroups(req.user.id);

        res.status(200).json({
            success: true,
            data: { groups },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { createGroup, joinGroup, getUserGroups };