const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// --------------- Middleware ---------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true,
    })
);

// --------------- Health Check ---------------
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --------------- Routes ---------------
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/groups', require('./routes/group.routes'));
app.use('/api/expenses', require('./routes/expense.routes'));

// Group-scoped routes
const { protect } = require('./middleware/auth');
const { getGroupExpenses, voteOnExpense, getPendingExpenses } = require('./controllers/expense.controller');
const { getGroupBalances } = require('./controllers/balance.controller');
const { createPayment, getGroupPayments } = require('./controllers/payment.controller');
const { voteOverdue, getOverdueStatus } = require('./controllers/overdue.controller');

// Expenses
app.get('/api/groups/:groupId/expenses', protect, getGroupExpenses);
app.get('/api/groups/:groupId/pending-expenses', protect, getPendingExpenses);
app.post('/api/expenses/:expenseId/vote', protect, voteOnExpense);

// Balances
app.get('/api/groups/:groupId/balances', protect, getGroupBalances);

// Payments
app.post('/api/groups/:groupId/payments', protect, createPayment);
app.get('/api/groups/:groupId/payments', protect, getGroupPayments);

// Overdue Governance
app.post('/api/groups/:groupId/overdue/:userId/vote', protect, voteOverdue);
app.get('/api/groups/:groupId/overdue-status', protect, getOverdueStatus);

// --------------- Error Handler ---------------
app.use(errorHandler);

module.exports = app;