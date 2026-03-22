const Expense = require('../models/Expense');
const Group = require('../models/Group');
const GroupMemberStatus = require('../models/GroupMemberStatus');
const { isValidPaise } = require('../utils/money');

/**
 * Compute equal-split shares deterministically.
 * Distributes remainder paise to the first N users so sum === totalAmount exactly.
 *
 * @param {number} totalAmount – integer paise
 * @param {string[]} userIds – array of user ObjectId strings
 * @returns {{ user: string, shareAmount: number }[]}
 */
const computeEqualSplits = (totalAmount, userIds) => {
    const count = userIds.length;
    const base = Math.floor(totalAmount / count);
    const remainder = totalAmount - base * count;

    return userIds.map((userId, index) => ({
        user: userId,
        shareAmount: base + (index < remainder ? 1 : 0),
        paidAmount: 0,
    }));
};

/**
 * Add an expense to a group.
 * New expenses start as 'pending' unless group has only 1 member (auto-approve).
 */
const addExpense = async (data, userId) => {
    const {
        group: groupId,
        description,
        totalAmount,
        paidBy,
        equalSplit,
        splitUsers,
        splits: customSplits,
        isRecurring,
        recurrence,
    } = data;

    // 1. Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
        const error = new Error('Group not found');
        error.statusCode = 404;
        throw error;
    }

    const memberIds = group.members.map((m) => m.toString());

    // 2. Verify authenticated user is a member
    if (!memberIds.includes(userId.toString())) {
        const error = new Error('You are not a member of this group');
        error.statusCode = 403;
        throw error;
    }

    // 3. Check group-scoped overdue status
    const memberStatus = await GroupMemberStatus.findOne({
        group: groupId,
        user: userId,
    });
    if (memberStatus && memberStatus.status === 'overdue') {
        const error = new Error(
            'Overdue users are restricted from governance actions but may still settle debts.'
        );
        error.statusCode = 403;
        throw error;
    }

    // 4. Verify paidBy is a member
    if (!memberIds.includes(paidBy.toString())) {
        const error = new Error('Payer must be a member of the group');
        error.statusCode = 400;
        throw error;
    }

    // 5. Validate totalAmount
    if (!isValidPaise(totalAmount) || totalAmount < 1) {
        const error = new Error('Total amount must be a positive integer (paise)');
        error.statusCode = 400;
        throw error;
    }

    // 6. Build splits
    let splits;

    if (equalSplit) {
        if (!splitUsers || !Array.isArray(splitUsers) || splitUsers.length === 0) {
            const error = new Error('Split users are required for equal split');
            error.statusCode = 400;
            throw error;
        }

        for (const uid of splitUsers) {
            if (!memberIds.includes(uid.toString())) {
                const error = new Error(`User ${uid} is not a member of this group`);
                error.statusCode = 400;
                throw error;
            }
        }

        const uniqueUsers = new Set(splitUsers.map((u) => u.toString()));
        if (uniqueUsers.size !== splitUsers.length) {
            const error = new Error('Duplicate users in split');
            error.statusCode = 400;
            throw error;
        }

        splits = computeEqualSplits(totalAmount, splitUsers);
    } else {
        if (!customSplits || !Array.isArray(customSplits) || customSplits.length === 0) {
            const error = new Error('Splits are required');
            error.statusCode = 400;
            throw error;
        }

        const seenUsers = new Set();
        let splitSum = 0;

        for (const split of customSplits) {
            if (!split.user) {
                const error = new Error('Each split must have a user');
                error.statusCode = 400;
                throw error;
            }

            if (!memberIds.includes(split.user.toString())) {
                const error = new Error(`User ${split.user} is not a member of this group`);
                error.statusCode = 400;
                throw error;
            }

            const uid = split.user.toString();
            if (seenUsers.has(uid)) {
                const error = new Error('Duplicate users in splits');
                error.statusCode = 400;
                throw error;
            }
            seenUsers.add(uid);

            if (!isValidPaise(split.shareAmount)) {
                const error = new Error('Each share amount must be a non-negative integer (paise)');
                error.statusCode = 400;
                throw error;
            }

            splitSum += split.shareAmount;
        }

        if (splitSum !== totalAmount) {
            const error = new Error(
                `Sum of shares (${splitSum}) does not equal total amount (${totalAmount})`
            );
            error.statusCode = 400;
            throw error;
        }

        splits = customSplits.map((s) => ({
            user: s.user,
            shareAmount: s.shareAmount,
            paidAmount: 0,
        }));
    }

    // 7. Compute approval requirements
    const groupSize = memberIds.length;
    const requiredApprovals = Math.ceil(groupSize / 2);
    const autoApprove = groupSize === 1;

    // 8. Create expense
    const expenseData = {
        group: groupId,
        createdBy: userId,
        description,
        totalAmount,
        paidBy,
        splits,
        status: autoApprove ? 'approved' : 'pending',
        approvals: [],
        requiredApprovals,
        isRecurring: isRecurring || false,
    };

    if (isRecurring && recurrence) {
        expenseData.recurrence = {
            frequency: recurrence.frequency,
            interval: recurrence.interval || 1,
        };
    }

    const expense = await Expense.create(expenseData);

    return expense.populate([
        { path: 'paidBy', select: 'name email' },
        { path: 'splits.user', select: 'name email' },
        { path: 'createdBy', select: 'name email' },
    ]);
};

/**
 * Vote on an expense (approve or reject).
 *
 * @param {string} expenseId
 * @param {string} userId – voter
 * @param {string} vote – 'approve' or 'reject'
 */
const voteOnExpense = async (expenseId, userId, vote) => {
    // 1. Validate vote value
    if (!['approve', 'reject'].includes(vote)) {
        const error = new Error('Vote must be "approve" or "reject"');
        error.statusCode = 400;
        throw error;
    }

    // 2. Fetch expense
    const expense = await Expense.findById(expenseId);
    if (!expense) {
        const error = new Error('Expense not found');
        error.statusCode = 404;
        throw error;
    }

    // 3. Cannot vote on decided expenses
    if (expense.status !== 'pending') {
        const error = new Error(`Expense is already ${expense.status}`);
        error.statusCode = 400;
        throw error;
    }

    // 4. Fetch group for membership check
    const group = await Group.findById(expense.group);
    if (!group) {
        const error = new Error('Group not found');
        error.statusCode = 404;
        throw error;
    }

    const memberIds = group.members.map((m) => m.toString());

    // 5. Must be a group member
    if (!memberIds.includes(userId.toString())) {
        const error = new Error('You are not a member of this group');
        error.statusCode = 403;
        throw error;
    }

    // 6. Check group-scoped overdue status
    const memberStatus = await GroupMemberStatus.findOne({
        group: expense.group,
        user: userId,
    });
    if (memberStatus && memberStatus.status === 'overdue') {
        const error = new Error(
            'Overdue users are restricted from governance actions but may still settle debts.'
        );
        error.statusCode = 403;
        throw error;
    }

    // 7. Cannot vote twice
    const alreadyVoted = expense.approvals.some(
        (a) => a.user.toString() === userId.toString()
    );
    if (alreadyVoted) {
        const error = new Error('You have already voted on this expense');
        error.statusCode = 409;
        throw error;
    }

    // 8. Record vote
    expense.approvals.push({ user: userId, vote });

    // 9. Check thresholds
    const approveCount = expense.approvals.filter((a) => a.vote === 'approve').length;
    const rejectCount = expense.approvals.filter((a) => a.vote === 'reject').length;
    const groupSize = memberIds.length;

    if (approveCount >= expense.requiredApprovals) {
        expense.status = 'approved';
    } else if (rejectCount > groupSize - expense.requiredApprovals) {
        expense.status = 'rejected';
    }

    await expense.save();

    return expense.populate([
        { path: 'paidBy', select: 'name email' },
        { path: 'splits.user', select: 'name email' },
        { path: 'createdBy', select: 'name email' },
        { path: 'approvals.user', select: 'name email' },
    ]);
};

/**
 * Get all expenses for a group.
 */
const getGroupExpenses = async (groupId, userId) => {
    const group = await Group.findById(groupId);
    if (!group) {
        const error = new Error('Group not found');
        error.statusCode = 404;
        throw error;
    }

    const isMember = group.members.some(
        (m) => m.toString() === userId.toString()
    );
    if (!isMember) {
        const error = new Error('You are not a member of this group');
        error.statusCode = 403;
        throw error;
    }

    const expenses = await Expense.find({ group: groupId })
        .populate('paidBy', 'name email')
        .populate('splits.user', 'name email')
        .populate('createdBy', 'name email')
        .populate('approvals.user', 'name email')
        .sort({ createdAt: -1 });

    return expenses;
};

/**
 * Get pending expenses for a group.
 */
const getPendingExpenses = async (groupId, userId) => {
    const group = await Group.findById(groupId);
    if (!group) {
        const error = new Error('Group not found');
        error.statusCode = 404;
        throw error;
    }

    const isMember = group.members.some(
        (m) => m.toString() === userId.toString()
    );
    if (!isMember) {
        const error = new Error('You are not a member of this group');
        error.statusCode = 403;
        throw error;
    }

    const expenses = await Expense.find({ group: groupId, status: 'pending' })
        .populate('paidBy', 'name email')
        .populate('splits.user', 'name email')
        .populate('createdBy', 'name email')
        .populate('approvals.user', 'name email')
        .sort({ createdAt: -1 });

    return expenses;
};

module.exports = { addExpense, voteOnExpense, getGroupExpenses, getPendingExpenses, computeEqualSplits };
