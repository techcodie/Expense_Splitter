const express = require('express');
const router = express.Router();
const { addExpense, getGroupExpenses } = require('../controllers/expense.controller');
const { protect } = require('../middleware/auth');

// All expense routes are protected
router.use(protect);

// POST /api/expenses — add new expense
router.post('/', addExpense);

// POST /api/expenses/:expenseId/vote
const { voteOnExpense } = require('../controllers/expense.controller');
router.post('/:expenseId/vote', voteOnExpense);

module.exports = router;
