const Payment = require('../models/Payment');
const Group = require('../models/Group');
const { computeNetBalances } = require('./balance.service');
const { isValidPaise } = require('../utils/money');

/**
 * Create a partial payment within a group.
 *
 * Validation chain:
 *  1. Group exists → 404
 *  2. Auth user is member → 403
 *  3. from and to are members → 400
 *  4. from !== to → 400
 *  5. amount is valid integer paise → 400
 *  6. Debtor actually owes, creditor is actually owed → 400
 *  7. Amount does not exceed what's owed → 400
 *
 * @param {string} groupId
 * @param {string} fromUserId – debtor
 * @param {string} toUserId – creditor
 * @param {number} amount – integer paise
 * @param {string} authUserId – authenticated user
 */
const createPayment = async (groupId, fromUserId, toUserId, amount, authUserId) => {
    // 1. Group exists
    const group = await Group.findById(groupId);
    if (!group) {
        const error = new Error('Group not found');
        error.statusCode = 404;
        throw error;
    }

    const memberIds = group.members.map((m) => m.toString());

    // 2. Auth user is member
    if (!memberIds.includes(authUserId.toString())) {
        const error = new Error('You are not a member of this group');
        error.statusCode = 403;
        throw error;
    }

    // 3. from and to are members
    if (!memberIds.includes(fromUserId.toString())) {
        const error = new Error('Debtor is not a member of this group');
        error.statusCode = 400;
        throw error;
    }
    if (!memberIds.includes(toUserId.toString())) {
        const error = new Error('Creditor is not a member of this group');
        error.statusCode = 400;
        throw error;
    }

    // 4. Self-payment check
    if (fromUserId.toString() === toUserId.toString()) {
        const error = new Error('Cannot make a payment to yourself');
        error.statusCode = 400;
        throw error;
    }

    // 5. Amount validation
    if (!isValidPaise(amount) || amount < 1) {
        const error = new Error('Amount must be a positive integer (paise)');
        error.statusCode = 400;
        throw error;
    }

    // 6. Compute current net balances (includes existing payments)
    const balances = await computeNetBalances(groupId);

    const debtorBalance = balances.find((b) => b.userId === fromUserId.toString());
    const creditorBalance = balances.find((b) => b.userId === toUserId.toString());

    if (!debtorBalance || debtorBalance.net >= 0) {
        const error = new Error('The selected user does not owe any money');
        error.statusCode = 400;
        throw error;
    }

    if (!creditorBalance || creditorBalance.net <= 0) {
        const error = new Error('The selected user is not owed any money');
        error.statusCode = 400;
        throw error;
    }

    // 7. Overpayment check
    const maxPayable = Math.min(Math.abs(debtorBalance.net), creditorBalance.net);
    if (amount > maxPayable) {
        const error = new Error(
            `Payment amount (${amount}) exceeds maximum payable (${maxPayable})`
        );
        error.statusCode = 400;
        throw error;
    }

    // 8. Create payment
    const payment = await Payment.create({
        group: groupId,
        from: fromUserId,
        to: toUserId,
        amount,
        createdBy: authUserId,
    });

    return payment.populate([
        { path: 'from', select: 'name email' },
        { path: 'to', select: 'name email' },
        { path: 'createdBy', select: 'name email' },
    ]);
};

/**
 * Get all payments for a group.
 */
const getGroupPayments = async (groupId, authUserId) => {
    const group = await Group.findById(groupId);
    if (!group) {
        const error = new Error('Group not found');
        error.statusCode = 404;
        throw error;
    }

    const isMember = group.members.some(
        (m) => m.toString() === authUserId.toString()
    );
    if (!isMember) {
        const error = new Error('You are not a member of this group');
        error.statusCode = 403;
        throw error;
    }

    const payments = await Payment.find({ group: groupId })
        .populate('from', 'name email')
        .populate('to', 'name email')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });

    return payments;
};

module.exports = { createPayment, getGroupPayments };