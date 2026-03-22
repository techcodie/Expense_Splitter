const express = require('express');
const router = express.Router();
const { addExpense, getGroupExpenses } = require('../controllers/expense.controller');
const { protect } = require('../middleware/auth');

// All expense routes are protected
router.use(protect);

// POST /api/expenses — add new expense
router.post('/', addExpense);

// GET /api/groups/:groupId/expenses — handled via group-scoped route
// (mounted separately in app.js)

module.exports = router;
