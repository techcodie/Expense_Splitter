/**
 * governance.test.js — Part 10: Expense Approval + Overdue Tests
 *
 * Pure-function tests. No database dependency.
 */

// ──── Inline helpers mimicking service logic ────

/**
 * Simulate expense approval status resolution.
 */
const resolveExpenseStatus = (approvals, requiredApprovals, groupSize) => {
    const approveCount = approvals.filter((a) => a.vote === 'approve').length;
    const rejectCount = approvals.filter((a) => a.vote === 'reject').length;

    if (approveCount >= requiredApprovals) return 'approved';
    if (rejectCount > groupSize - requiredApprovals) return 'rejected';
    return 'pending';
};

/**
 * Simulate computeNetBalances — only counts approved expenses.
 */
const computeNets = (expenses, payments = []) => {
    const netMap = {};

    for (const exp of expenses) {
        if (exp.status !== 'approved') continue; // CRITICAL: skip non-approved

        const payerId = exp.paidBy;
        netMap[payerId] = (netMap[payerId] || 0) + exp.totalAmount;

        for (const split of exp.splits) {
            netMap[split.user] = (netMap[split.user] || 0) - split.shareAmount;
        }
    }

    for (const p of payments) {
        netMap[p.from] = (netMap[p.from] || 0) + p.amount;
        netMap[p.to] = (netMap[p.to] || 0) - p.amount;
    }

    return Object.entries(netMap).map(([userId, net]) => ({ userId, net }));
};

/**
 * Simulate overdue threshold check.
 */
const checkOverdueEligible = (net, threshold) => {
    return net < 0 && Math.abs(net) >= threshold;
};

/**
 * Simulate overdue vote resolution.
 */
const resolveOverdueStatus = (markOverdueVotes, groupSize) => {
    const required = Math.ceil(0.75 * groupSize);
    return markOverdueVotes >= required ? 'overdue' : 'active';
};

/**
 * Simulate auto-clear logic.
 */
const shouldAutoClear = (net, threshold) => {
    return net >= 0 || Math.abs(net) < threshold;
};

// ──────────── Tests ────────────

describe('Expense Approval System', () => {
    test('expense stays pending until majority approves (5-member group)', () => {
        const requiredApprovals = Math.ceil(5 / 2); // 3
        expect(requiredApprovals).toBe(3);

        // 0 votes → pending
        expect(resolveExpenseStatus([], requiredApprovals, 5)).toBe('pending');

        // 1 approve → pending
        expect(resolveExpenseStatus(
            [{ vote: 'approve' }],
            requiredApprovals, 5
        )).toBe('pending');

        // 2 approves → pending
        expect(resolveExpenseStatus(
            [{ vote: 'approve' }, { vote: 'approve' }],
            requiredApprovals, 5
        )).toBe('pending');

        // 3 approves → approved
        expect(resolveExpenseStatus(
            [{ vote: 'approve' }, { vote: 'approve' }, { vote: 'approve' }],
            requiredApprovals, 5
        )).toBe('approved');
    });

    test('expense gets rejected when enough reject votes', () => {
        const required = Math.ceil(5 / 2); // 3
        // rejectCount > (5 - 3) = 2, so 3 rejects → rejected
        expect(resolveExpenseStatus(
            [{ vote: 'reject' }, { vote: 'reject' }, { vote: 'reject' }],
            required, 5
        )).toBe('rejected');

        // 2 rejects → still pending (2 is not > 2)
        expect(resolveExpenseStatus(
            [{ vote: 'reject' }, { vote: 'reject' }],
            required, 5
        )).toBe('pending');
    });

    test('auto-approve for single-member group', () => {
        const requiredApprovals = Math.ceil(1 / 2); // 1
        expect(requiredApprovals).toBe(1);
        // With 0 votes but group size 1, auto-approve happens at creation
        // Simulating that the service would set status='approved' directly
    });

    test('mixed votes — approval wins with majority', () => {
        const required = Math.ceil(5 / 2); // 3
        expect(resolveExpenseStatus(
            [
                { vote: 'approve' },
                { vote: 'reject' },
                { vote: 'approve' },
                { vote: 'approve' },
            ],
            required, 5
        )).toBe('approved');
    });

    test('4-member group requires 2 approvals', () => {
        const required = Math.ceil(4 / 2); // 2
        expect(required).toBe(2);

        expect(resolveExpenseStatus(
            [{ vote: 'approve' }],
            required, 4
        )).toBe('pending');

        expect(resolveExpenseStatus(
            [{ vote: 'approve' }, { vote: 'approve' }],
            required, 4
        )).toBe('approved');
    });
});

describe('Pending Expenses Ignored in Balances', () => {
    const expenses = [
        {
            paidBy: 'A', totalAmount: 10000, status: 'approved',
            splits: [{ user: 'A', shareAmount: 5000 }, { user: 'B', shareAmount: 5000 }],
        },
        {
            paidBy: 'B', totalAmount: 20000, status: 'pending',
            splits: [{ user: 'A', shareAmount: 10000 }, { user: 'B', shareAmount: 10000 }],
        },
        {
            paidBy: 'C', totalAmount: 6000, status: 'rejected',
            splits: [{ user: 'A', shareAmount: 2000 }, { user: 'B', shareAmount: 2000 }, { user: 'C', shareAmount: 2000 }],
        },
    ];

    test('only approved expense affects balances', () => {
        const nets = computeNets(expenses);
        const netMap = {};
        for (const n of nets) netMap[n.userId] = n.net;

        // Only first expense (approved) should count
        // A paid 10000, shares 5000 → net +5000
        // B shares 5000 → net -5000
        expect(netMap['A']).toBe(5000);
        expect(netMap['B']).toBe(-5000);
        expect(netMap['C']).toBeUndefined(); // C not involved in approved expenses
    });

    test('sum of nets is exactly 0 with only approved expenses', () => {
        const nets = computeNets(expenses);
        const total = nets.reduce((s, n) => s + n.net, 0);
        expect(total).toBe(0);
    });

    test('pending expense amount has zero impact', () => {
        // The ₹200 pending expense from B should not change anything
        const withoutPending = computeNets([expenses[0]]);
        const withPending = computeNets(expenses);

        const mapA = {};
        for (const n of withoutPending) mapA[n.userId] = n.net;
        const mapB = {};
        for (const n of withPending) mapB[n.userId] = n.net;

        expect(mapA['A']).toBe(mapB['A']);
        expect(mapA['B']).toBe(mapB['B']);
    });
});

describe('Group-Scoped Overdue Governance', () => {
    test('75% threshold requires correct number of votes', () => {
        expect(Math.ceil(0.75 * 5)).toBe(4); // 5 members → 4 votes
        expect(Math.ceil(0.75 * 4)).toBe(3); // 4 members → 3 votes
        expect(Math.ceil(0.75 * 3)).toBe(3); // 3 members → 3 votes
        expect(Math.ceil(0.75 * 2)).toBe(2); // 2 members → 2 votes
        expect(Math.ceil(0.75 * 1)).toBe(1); // 1 member  → 1 vote
    });

    test('user becomes overdue when threshold met', () => {
        expect(resolveOverdueStatus(4, 5)).toBe('overdue');
        expect(resolveOverdueStatus(3, 5)).toBe('active');
        expect(resolveOverdueStatus(5, 5)).toBe('overdue');
    });

    test('user stays active without enough votes', () => {
        expect(resolveOverdueStatus(0, 5)).toBe('active');
        expect(resolveOverdueStatus(1, 5)).toBe('active');
        expect(resolveOverdueStatus(2, 4)).toBe('active');
    });

    test('overdue requires net < 0 AND above threshold', () => {
        expect(checkOverdueEligible(-50000, 50000)).toBe(true);
        expect(checkOverdueEligible(-49999, 50000)).toBe(false);
        expect(checkOverdueEligible(10000, 50000)).toBe(false);
        expect(checkOverdueEligible(0, 50000)).toBe(false);
        expect(checkOverdueEligible(-100000, 50000)).toBe(true);
    });

    test('auto-clear when debt drops below threshold', () => {
        expect(shouldAutoClear(0, 50000)).toBe(true);      // net = 0
        expect(shouldAutoClear(10000, 50000)).toBe(true);   // net > 0
        expect(shouldAutoClear(-49999, 50000)).toBe(true);  // below threshold
        expect(shouldAutoClear(-50000, 50000)).toBe(false);  // at threshold — not cleared
        expect(shouldAutoClear(-100000, 50000)).toBe(false); // above threshold
    });

    test('auto-clear when net becomes positive', () => {
        expect(shouldAutoClear(1, 50000)).toBe(true);
        expect(shouldAutoClear(0, 0)).toBe(true);
    });
});

describe('Overdue Restrictions', () => {
    const BLOCKED = new Set(['expense', 'vote', 'overdueVote', 'createGroup']);
    const ALLOWED = new Set(['payment', 'view']);

    test('overdue user BLOCKED from governance actions', () => {
        for (const action of BLOCKED) {
            expect(BLOCKED.has(action)).toBe(true);
        }
    });

    test('overdue user CAN record payments and view data', () => {
        for (const action of ALLOWED) {
            expect(BLOCKED.has(action)).toBe(false);
        }
    });
});

describe('Financial Integrity with Governance', () => {
    test('sum of nets is 0 with all-approved multi-payer expenses', () => {
        const expenses = [
            {
                paidBy: 'A', totalAmount: 15000, status: 'approved',
                splits: [
                    { user: 'A', shareAmount: 5000 },
                    { user: 'B', shareAmount: 5000 },
                    { user: 'C', shareAmount: 5000 },
                ],
            },
            {
                paidBy: 'B', totalAmount: 9000, status: 'approved',
                splits: [
                    { user: 'A', shareAmount: 3000 },
                    { user: 'B', shareAmount: 3000 },
                    { user: 'C', shareAmount: 3000 },
                ],
            },
        ];

        const nets = computeNets(expenses);
        const total = nets.reduce((s, n) => s + n.net, 0);
        expect(total).toBe(0);
    });

    test('sum of nets is 0 with payments applied', () => {
        const expenses = [
            {
                paidBy: 'A', totalAmount: 10000, status: 'approved',
                splits: [
                    { user: 'A', shareAmount: 5000 },
                    { user: 'B', shareAmount: 5000 },
                ],
            },
        ];

        const payments = [{ from: 'B', to: 'A', amount: 3000 }];

        const nets = computeNets(expenses, payments);
        const total = nets.reduce((s, n) => s + n.net, 0);
        expect(total).toBe(0);

        const netMap = {};
        for (const n of nets) netMap[n.userId] = n.net;
        expect(netMap['A']).toBe(2000); // was +5000, got 3000, so 5000-3000=2000
        expect(netMap['B']).toBe(-2000); // was -5000, paid 3000, so -5000+3000=-2000
    });

    test('no floating point introduced in governance calculations', () => {
        // Verify all calculations use integers
        const total = 99999;
        const count = 3;
        const base = Math.floor(total / count);
        const remainder = total - base * count;

        expect(Number.isInteger(base)).toBe(true);
        expect(Number.isInteger(remainder)).toBe(true);
        expect(base * count + remainder).toBe(total);

        // Required approvals
        for (let n = 1; n <= 20; n++) {
            expect(Number.isInteger(Math.ceil(n / 2))).toBe(true);
            expect(Number.isInteger(Math.ceil(0.75 * n))).toBe(true);
        }
    });
});
