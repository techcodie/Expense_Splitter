const GroupMemberStatus = require('../models/GroupMemberStatus');

/**
 * Middleware factory: requireActiveGroupMember
 *
 * Checks if the authenticated user is overdue in the target group.
 * Blocks governance actions; allows payments and view actions.
 *
 * @param {string} actionType – 'expense' | 'vote' | 'overdueVote' | 'createGroup' | 'payment' | 'view'
 */
const BLOCKED_ACTIONS = new Set(['expense', 'vote', 'overdueVote', 'createGroup']);

const requireActiveGroupMember = (actionType) => {
    return async (req, res, next) => {
        // Actions that are always allowed → skip check
        if (!BLOCKED_ACTIONS.has(actionType)) {
            return next();
        }

        try {
            // Determine groupId from various sources
            const groupId =
                req.params.groupId ||
                req.body.group ||
                (req.expense && req.expense.group?.toString());

            if (!groupId) {
                // If no group context, allow (will fail on other validations)
                return next();
            }

            const status = await GroupMemberStatus.findOne({
                group: groupId,
                user: req.user.id,
            });

            if (status && status.status === 'overdue') {
                return res.status(403).json({
                    success: false,
                    error: 'Overdue users are restricted from governance actions but may still settle debts.',
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

module.exports = { requireActiveGroupMember };
