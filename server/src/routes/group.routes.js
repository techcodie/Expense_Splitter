const express = require('express');
const router = express.Router();
const { createGroup, joinGroup, getUserGroups } = require('../controllers/group.controller');
const { protect } = require('../middleware/auth');

// All group routes are protected
router.use(protect);

router.post('/', createGroup);
router.post('/join', joinGroup);
router.get('/', getUserGroups);

// Group-scoped routes
const { getGroupExpenses, getPendingExpenses } = require('../controllers/expense.controller');
const { getGroupBalances } = require('../controllers/balance.controller');
const { createPayment, getGroupPayments } = require('../controllers/payment.controller');
const { voteOverdue, getOverdueStatus } = require('../controllers/overdue.controller');

// Expenses
router.get('/:groupId/expenses', getGroupExpenses);
router.get('/:groupId/pending-expenses', getPendingExpenses);

// Balances
router.get('/:groupId/balances', getGroupBalances);

// Payments
router.post('/:groupId/payments', createPayment);
router.get('/:groupId/payments', getGroupPayments);

// Overdue Governance
router.post('/:groupId/overdue/:userId/vote', voteOverdue);
router.get('/:groupId/overdue-status', getOverdueStatus);

module.exports = router;