const OverdueVote = require('../models/OverdueVote');
const GroupMemberStatus = require('../models/GroupMemberStatus');
const Group = require('../models/Group');

/**
 * Vote to mark/clear a user as overdue in a group.
 *
 * @param {string} groupId
 * @param {string} targetUserId – user being voted on
 * @param {string} voterId – voter
 * @param {string} vote – 'mark_overdue' | 'clear_overdue'
 */
const voteOverdue = async (groupId, targetUserId, voterId, vote) => {
    // 1. Validate vote value
    if (!['mark_overdue', 'clear_overdue'].includes(vote)) {
        const error = new Error('Vote must be "mark_overdue" or "clear_overdue"');
        error.statusCode = 400;
        throw error;
    }

    // 2. Fetch group
    const group = await Group.findById(groupId);
    if (!group) {
        const error = new Error('Group not found');
        error.statusCode = 404;
        throw error;
    }

    const memberIds = group.members.map((m) => m.toString());

    // 3. Voter must be a member
    if (!memberIds.includes(voterId.toString())) {
        const error = new Error('You are not a member of this group');
        error.statusCode = 403;
        throw error;
    }

    // 4. Target must be a member
    if (!memberIds.includes(targetUserId.toString())) {
        const error = new Error('Target user is not a member of this group');
        error.statusCode = 400;
        throw error;
    }

    // 5. Cannot vote on yourself
    if (voterId.toString() === targetUserId.toString()) {
        const error = new Error('Cannot vote on your own overdue status');
        error.statusCode = 400;
        throw error;
    }

    // 6. Check voter is not overdue
    const voterStatus = await GroupMemberStatus.findOne({
        group: groupId,
        user: voterId,
    });
    if (voterStatus && voterStatus.status === 'overdue') {
        const error = new Error(
            'Overdue users are restricted from governance actions but may still settle debts.'
        );
        error.statusCode = 403;
        throw error;
    }

    // 7. Upsert vote (voter can change their vote)
    await OverdueVote.findOneAndUpdate(
        { group: groupId, targetUser: targetUserId, voter: voterId },
        { vote },
        { upsert: true, new: true }
    );

    // 8. Count mark_overdue votes
    const markOverdueCount = await OverdueVote.countDocuments({
        group: groupId,
        targetUser: targetUserId,
        vote: 'mark_overdue',
    });

    const requiredVotes = Math.ceil(0.75 * memberIds.length);

    // 9. Update status based on threshold
    if (markOverdueCount >= requiredVotes) {
        await GroupMemberStatus.findOneAndUpdate(
            { group: groupId, user: targetUserId },
            { status: 'overdue' },
            { upsert: true, new: true }
        );
    } else {
        // Not enough votes for overdue, set active
        await GroupMemberStatus.findOneAndUpdate(
            { group: groupId, user: targetUserId },
            { status: 'active' },
            { upsert: true, new: true }
        );
    }

    // 10. Return current status
    const currentVotes = await OverdueVote.find({
        group: groupId,
        targetUser: targetUserId,
    }).populate('voter', 'name email');

    const status = await GroupMemberStatus.findOne({
        group: groupId,
        user: targetUserId,
    });

    return {
        targetUser: targetUserId,
        status: status?.status || 'active',
        votes: currentVotes,
        markOverdueCount,
        requiredVotes,
    };
};

/**
 * Get overdue status for all members of a group.
 *
 * @param {string} groupId
 * @param {string} userId – requesting user (for membership check)
 */
const getOverdueStatus = async (groupId, userId) => {
    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) {
        const error = new Error('Group not found');
        error.statusCode = 404;
        throw error;
    }

    const isMember = group.members.some(
        (m) => m._id.toString() === userId.toString()
    );
    if (!isMember) {
        const error = new Error('You are not a member of this group');
        error.statusCode = 403;
        throw error;
    }

    // Fetch all statuses
    const statuses = await GroupMemberStatus.find({ group: groupId });
    const statusMap = {};
    for (const s of statuses) {
        statusMap[s.user.toString()] = s.status;
    }

    // Fetch all votes
    const votes = await OverdueVote.find({ group: groupId })
        .populate('voter', 'name email');

    const requiredVotes = Math.ceil(0.75 * group.members.length);

    const result = group.members.map((m) => {
        const memberId = m._id.toString();
        const memberVotes = votes.filter(
            (v) => v.targetUser.toString() === memberId
        );
        const markCount = memberVotes.filter((v) => v.vote === 'mark_overdue').length;

        return {
            userId: memberId,
            name: m.name,
            email: m.email,
            status: statusMap[memberId] || 'active',
            markOverdueVotes: markCount,
            requiredVotes,
            votes: memberVotes,
        };
    });

    return result;
};

/**
 * Auto-resolve overdue statuses based on current net balances.
 *
 * Called after balance computation. If a user's debt has been reduced
 * below the threshold (or they no longer owe), auto-clear to 'active'.
 *
 * @param {string} groupId
 * @param {{ userId: string, net: number }[]} balances
 */
const autoResolveOverdue = async (groupId, balances) => {
    const group = await Group.findById(groupId);
    if (!group) return;

    const threshold = group.settlementThreshold;

    for (const b of balances) {
        // If user is no longer in debt OR debt is below threshold → auto-clear
        if (b.net >= 0 || Math.abs(b.net) < threshold) {
            await GroupMemberStatus.findOneAndUpdate(
                { group: groupId, user: b.userId },
                { status: 'active' },
                { upsert: true }
            );
        }
    }
};

module.exports = { voteOverdue, getOverdueStatus, autoResolveOverdue };
