const paymentService = require('../services/payment.service');
const { isValidPaise } = require('../utils/money');

/**
 * POST /api/groups/:groupId/payments
 * Record a partial payment.
 */
const createPayment = async (req, res, next) => {
    try {
        const { groupId } = req.params;
        const { from, to, amount } = req.body;

        // Basic presence validation
        if (!from) {
            return res.status(400).json({ success: false, error: 'Debtor (from) is required' });
        }
        if (!to) {
            return res.status(400).json({ success: false, error: 'Creditor (to) is required' });
        }
        if (amount === undefined || amount === null) {
            return res.status(400).json({ success: false, error: 'Amount is required' });
        }
        if (!Number.isInteger(amount) || amount < 1) {
            return res.status(400).json({
                success: false,
                error: 'Amount must be a positive integer (paise)',
            });
        }

        const payment = await paymentService.createPayment(
            groupId,
            from,
            to,
            amount,
            req.user.id
        );

        res.status(201).json({
            success: true,
            data: { payment },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/groups/:groupId/payments
 * List all payments for a group.
 */
const getGroupPayments = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        const payments = await paymentService.getGroupPayments(groupId, req.user.id);

        res.status(200).json({
            success: true,
            data: { payments },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { createPayment, getGroupPayments };