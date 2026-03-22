const Group = require('../models/Group');

/**
 * Create a new group.
 * Creator is automatically added as a member.
 */
const createGroup = async ({ name, password, settlementThreshold }, userId) => {
    const groupData = {
        name,
        createdBy: userId,
        members: [userId],
        settlementThreshold: settlementThreshold || 0,
    };

    // Only set password if provided (non-empty string)
    if (password && password.trim()) {
        groupData.password = password;
    }

    const group = await Group.create(groupData);
    return group;
};

/**
 * Join an existing group via joinCode.
 * Validates optional password if the group has one.
 */
const joinGroup = async ({ joinCode, password }, userId) => {
    // Find group and include password for comparison
    const group = await Group.findOne({ joinCode }).select('+password');

    if (!group) {
        const error = new Error('Group not found – invalid join code');
        error.statusCode = 404;
        throw error;
    }

    // Check if user is already a member
    const isMember = group.members.some(
        (memberId) => memberId.toString() === userId.toString()
    );
    if (isMember) {
        const error = new Error('You are already a member of this group');
        error.statusCode = 409;
        throw error;
    }

    // Validate password if the group has one
    if (group.password) {
        if (!password) {
            const error = new Error('This group requires a password');
            error.statusCode = 400;
            throw error;
        }
        const isMatch = await group.comparePassword(password);
        if (!isMatch) {
            const error = new Error('Invalid group password');
            error.statusCode = 401;
            throw error;
        }
    }

    // Add user to members
    group.members.push(userId);
    await group.save();

    // Return group without password
    group.password = undefined;
    return group;
};

/**
 * Get all groups the user belongs to.
 */
const getUserGroups = async (userId) => {
    const groups = await Group.find({ members: userId })
        .populate('members', 'name email')
        .populate('createdBy', 'name email')
        .sort({ updatedAt: -1 });

    return groups;
};

module.exports = { createGroup, joinGroup, getUserGroups };