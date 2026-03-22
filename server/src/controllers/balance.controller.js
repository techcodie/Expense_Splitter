const { computeNetBalances, computeThresholdAlerts, buildRawDebtGraph } = require('../services/balance.service');
const { minimizeTransactions } = require('../services/simplify.service');
const Group = require('../models/Group');

/**
 * GET /api/groups/:groupId/balances
 *
 * Returns:
 *  - balances: net balance per member (integer paise, includes payments)
 *  - rawGraph: un-simplified debt edges
 *  - simplifiedGraph: minimum cash flow settlement edges
 *  - thresholdAlerts: users whose debt exceeds group threshold
 */
const getGroupBalances = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        // Verify group exists
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, error: 'Group not found' });
        }

        // Verify user is a member
        const isMember = group.members.some(
            (m) => m.toString() === req.user.id.toString()
        );
        if (!isMember) {
            return res.status(403).json({
                success: false,
                error: 'You are not a member of this group',
            });
        }

        // Compute all datasets
        const balances = await computeNetBalances(groupId);
        const rawGraph = await buildRawDebtGraph(groupId);
        const simplifiedGraph = minimizeTransactions(balances);
        const thresholdAlerts = computeThresholdAlerts(
            balances,
            group.settlementThreshold || 0
        );

        res.status(200).json({
            success: true,
            data: {
                balances,
                rawGraph,
                simplifiedGraph,
                thresholdAlerts,
            },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { getGroupBalances };