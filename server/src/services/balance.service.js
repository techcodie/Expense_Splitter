const Expense = require('../models/Expense');
const Group = require('../models/Group');
const Payment = require('../models/Payment');
const { autoResolveOverdue } = require('./overdue.service');

/**
 * Compute the net balance for every member in a group.
 *
 * CRITICAL: Only 'approved' expenses affect balances.
 * Pending/rejected expenses are ignored.
 *
 * Logic (all integer paise):
 *   Phase 1 — Approved Expenses:
 *     net[paidBy]       += totalAmount
 *     net[split.user]   -= shareAmount
 *
 *   Phase 2 — Payments:
 *     net[payment.from] += payment.amount   (debtor's debt decreases)
 *     net[payment.to]   -= payment.amount   (creditor's credit decreases)
 *
 * @param {string} groupId
 * @returns {{ userId: string, name: string, email: string, net: number }[]}
 */
const computeNetBalances = async (groupId) => {
    // 1. Verify group exists
    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) {
        const error = new Error('Group not found');
        error.statusCode = 404;
        throw error;
    }

    // 2. Fetch ONLY approved expenses + all payments
    const [expenses, payments] = await Promise.all([
        Expense.find({ group: groupId, status: 'approved' }),
        Payment.find({ group: groupId }),
    ]);

    // 3. Initialize net map for all members at 0
    const netMap = {};
    const memberInfo = {};
    for (const member of group.members) {
        const id = member._id.toString();
        netMap[id] = 0;
        memberInfo[id] = { name: member.name, email: member.email };
    }

    // 4. Phase 1 — Process approved expenses
    for (const expense of expenses) {
        const payerId = expense.paidBy.toString();

        if (netMap[payerId] !== undefined) {
            netMap[payerId] += expense.totalAmount;
        }

        for (const split of expense.splits) {
            const userId = split.user.toString();
            if (netMap[userId] !== undefined) {
                netMap[userId] -= split.shareAmount;
            }
        }
    }

    // 5. Phase 2 — Apply payments
    for (const payment of payments) {
        const fromId = payment.from.toString();
        const toId = payment.to.toString();

        if (netMap[fromId] !== undefined) {
            netMap[fromId] += payment.amount;
        }

        if (netMap[toId] !== undefined) {
            netMap[toId] -= payment.amount;
        }
    }

    // 6. Integrity check — sum of all nets must be exactly 0
    let totalNet = 0;
    for (const id of Object.keys(netMap)) {
        totalNet += netMap[id];
    }
    if (totalNet !== 0) {
        const error = new Error(
            `Balance inconsistency detected: net sum is ${totalNet}, expected 0`
        );
        error.statusCode = 500;
        throw error;
    }

    // 7. Build result array
    const balances = Object.entries(netMap).map(([userId, net]) => ({
        userId,
        name: memberInfo[userId]?.name || 'Unknown',
        email: memberInfo[userId]?.email || '',
        net,
    }));

    // 8. Auto-resolve overdue statuses based on new balances
    await autoResolveOverdue(groupId, balances);

    return balances;
};

/**
 * Compute threshold alerts.
 *
 * @param {{ userId: string, name: string, net: number }[]} balances
 * @param {number} settlementThreshold – integer paise (0 = always alert)
 * @returns {{ userId: string, name: string, amountOwed: number }[]}
 */
const computeThresholdAlerts = (balances, settlementThreshold) => {
    const alerts = [];

    for (const b of balances) {
        if (b.net < 0) {
            const amountOwed = Math.abs(b.net);
            if (settlementThreshold === 0 || amountOwed >= settlementThreshold) {
                alerts.push({
                    userId: b.userId,
                    name: b.name,
                    amountOwed,
                });
            }
        }
    }

    alerts.sort((a, b) => b.amountOwed - a.amountOwed);

    return alerts;
};

/**
 * Build the raw (un-simplified) debt graph from APPROVED expenses only.
 *
 * @param {string} groupId
 * @returns {{ from: string, to: string, fromName: string, toName: string, amount: number }[]}
 */
const buildRawDebtGraph = async (groupId) => {
    const group = await Group.findById(groupId).populate('members', 'name email');
    if (!group) {
        const error = new Error('Group not found');
        error.statusCode = 404;
        throw error;
    }

    // CRITICAL: Only approved expenses
    const expenses = await Expense.find({ group: groupId, status: 'approved' });

    const memberNames = {};
    for (const m of group.members) {
        memberNames[m._id.toString()] = m.name;
    }

    const edgeMap = {};

    for (const expense of expenses) {
        const payerId = expense.paidBy.toString();

        for (const split of expense.splits) {
            const debtorId = split.user.toString();

            if (debtorId === payerId) continue;

            const key = `${debtorId}|${payerId}`;
            if (!edgeMap[key]) {
                edgeMap[key] = {
                    from: debtorId,
                    to: payerId,
                    fromName: memberNames[debtorId] || 'Unknown',
                    toName: memberNames[payerId] || 'Unknown',
                    amount: 0,
                };
            }
            edgeMap[key].amount += split.shareAmount;
        }
    }

    return Object.values(edgeMap).filter((e) => e.amount > 0);
};

module.exports = { computeNetBalances, computeThresholdAlerts, buildRawDebtGraph };