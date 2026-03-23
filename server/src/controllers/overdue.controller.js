const overdueService = require('../services/overdue.service');

/**
 * POST /api/groups/:groupId/overdue/:userId/vote
 * Vote to mark/clear a user as overdue.
 */
const voteOverdue = async (req, res, next) => {
    try {
        const { groupId, userId } = req.params;
        const { vote } = req.body;

        if (!vote) {
            return res.status(400).json({
                success: false,
                error: 'Vote is required (mark_overdue/clear_overdue)',
            });
        }

        const result = await overdueService.voteOverdue(
            groupId,
            userId,
            req.user.id,
            vote
        );

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/groups/:groupId/overdue-status
 * Get overdue status for all group members.
 */
const getOverdueStatus = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        const statuses = await overdueService.getOverdueStatus(groupId, req.user.id);

        res.status(200).json({
            success: true,
            data: { statuses },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { voteOverdue, getOverdueStatus };
