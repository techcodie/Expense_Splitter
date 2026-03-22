const expenseService = require('../services/expense.service');

/**
 * POST /api/expenses
 * Add an expense to a group.
 */
const addExpense = async (req, res, next) => {
    try {
        const {
            group,
            description,
            totalAmount,
            paidBy,
            equalSplit,
            splitUsers,
            splits,
            isRecurring,
            recurrence,
        } = req.body;

        // Basic presence validation
        if (!group) {
            return res.status(400).json({ success: false, error: 'Group ID is required' });
        }
        if (!description || !description.trim()) {
            return res.status(400).json({ success: false, error: 'Description is required' });
        }
        if (totalAmount === undefined || totalAmount === null) {
            return res.status(400).json({ success: false, error: 'Total amount is required' });
        }
        if (!Number.isInteger(totalAmount) || totalAmount < 1) {
            return res.status(400).json({
                success: false,
                error: 'Total amount must be a positive integer (paise)',
            });
        }
        if (!paidBy) {
            return res.status(400).json({ success: false, error: 'Paid-by user is required' });
        }

        const expense = await expenseService.addExpense(
            {
                group,
                description: description.trim(),
                totalAmount,
                paidBy,
                equalSplit: !!equalSplit,
                splitUsers,
                splits,
                isRecurring,
                recurrence,
            },
            req.user.id
        );

        res.status(201).json({
            success: true,
            data: { expense },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/groups/:groupId/expenses
 * Get all expenses for a group.
 */
const getGroupExpenses = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        if (!groupId) {
            return res.status(400).json({ success: false, error: 'Group ID is required' });
        }

        const expenses = await expenseService.getGroupExpenses(groupId, req.user.id);

        res.status(200).json({
            success: true,
            data: { expenses },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * POST /api/expenses/:expenseId/vote
 * Vote on an expense (approve/reject).
 */
const voteOnExpense = async (req, res, next) => {
    try {
        const { expenseId } = req.params;
        const { vote } = req.body;

        if (!expenseId) {
            return res.status(400).json({ success: false, error: 'Expense ID is required' });
        }
        if (!vote) {
            return res.status(400).json({ success: false, error: 'Vote is required (approve/reject)' });
        }

        const expense = await expenseService.voteOnExpense(expenseId, req.user.id, vote);

        res.status(200).json({
            success: true,
            data: { expense },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * GET /api/groups/:groupId/pending-expenses
 * Get pending expenses for a group.
 */
const getPendingExpenses = async (req, res, next) => {
    try {
        const { groupId } = req.params;

        const expenses = await expenseService.getPendingExpenses(groupId, req.user.id);

        res.status(200).json({
            success: true,
            data: { expenses },
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { addExpense, getGroupExpenses, voteOnExpense, getPendingExpenses };
