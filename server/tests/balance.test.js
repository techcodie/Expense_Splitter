/**
 * balance.test.js
 *
 * Tests for net balance computation logic.
 * Since computeNetBalances depends on MongoDB, we test the LOGIC
 * by extracting the pure computation and verifying independently.
 */

describe('Net Balance Computation Logic', () => {
    /**
     * Pure net balance calculator (mirrors computeNetBalances logic
     * without DB dependency).
     */
    function computeNets(members, expenses, payments = []) {
        const netMap = {};
        for (const m of members) {
            netMap[m.id] = 0;
        }

        // Phase 1: expenses
        for (const exp of expenses) {
            netMap[exp.paidBy] += exp.totalAmount;
            for (const split of exp.splits) {
                netMap[split.user] -= split.shareAmount;
            }
        }

        // Phase 2: payments
        for (const p of payments) {
            netMap[p.from] += p.amount;
            netMap[p.to] -= p.amount;
        }

        return netMap;
    }

    test('Case: A paid ₹300, split equally among A, B, C', () => {
        const members = [
            { id: 'A' }, { id: 'B' }, { id: 'C' },
        ];

        // ₹300 = 30000 paise, split 3 ways = 10000 each
        const expenses = [
            {
                paidBy: 'A',
                totalAmount: 30000,
                splits: [
                    { user: 'A', shareAmount: 10000 },
                    { user: 'B', shareAmount: 10000 },
                    { user: 'C', shareAmount: 10000 },
                ],
            },
        ];

        const nets = computeNets(members, expenses);

        expect(nets.A).toBe(20000);   // creditor: paid 30000, owes 10000
        expect(nets.B).toBe(-10000);  // debtor
        expect(nets.C).toBe(-10000);  // debtor
    });

    test('sum of nets always equals 0', () => {
        const members = [
            { id: 'A' }, { id: 'B' }, { id: 'C' }, { id: 'D' },
        ];

        const expenses = [
            {
                paidBy: 'A',
                totalAmount: 40000,
                splits: [
                    { user: 'A', shareAmount: 10000 },
                    { user: 'B', shareAmount: 10000 },
                    { user: 'C', shareAmount: 10000 },
                    { user: 'D', shareAmount: 10000 },
                ],
            },
            {
                paidBy: 'B',
                totalAmount: 20000,
                splits: [
                    { user: 'A', shareAmount: 5000 },
                    { user: 'B', shareAmount: 5000 },
                    { user: 'C', shareAmount: 5000 },
                    { user: 'D', shareAmount: 5000 },
                ],
            },
        ];

        const nets = computeNets(members, expenses);
        const sum = Object.values(nets).reduce((a, b) => a + b, 0);

        expect(sum).toBe(0);
    });

    test('no floating drift with odd split amounts', () => {
        const members = [
            { id: 'A' }, { id: 'B' }, { id: 'C' },
        ];

        // ₹100 = 10000 paise, 3-way split: 3334 + 3333 + 3333 = 10000
        const expenses = [
            {
                paidBy: 'A',
                totalAmount: 10000,
                splits: [
                    { user: 'A', shareAmount: 3334 },
                    { user: 'B', shareAmount: 3333 },
                    { user: 'C', shareAmount: 3333 },
                ],
            },
        ];

        const nets = computeNets(members, expenses);

        expect(Number.isInteger(nets.A)).toBe(true);
        expect(Number.isInteger(nets.B)).toBe(true);
        expect(Number.isInteger(nets.C)).toBe(true);

        const sum = Object.values(nets).reduce((a, b) => a + b, 0);
        expect(sum).toBe(0);

        expect(nets.A).toBe(6666);   // 10000 - 3334
        expect(nets.B).toBe(-3333);
        expect(nets.C).toBe(-3333);
    });

    test('multiple expenses accumulate correctly', () => {
        const members = [
            { id: 'A' }, { id: 'B' },
        ];

        const expenses = [
            {
                paidBy: 'A',
                totalAmount: 10000,
                splits: [
                    { user: 'A', shareAmount: 5000 },
                    { user: 'B', shareAmount: 5000 },
                ],
            },
            {
                paidBy: 'B',
                totalAmount: 6000,
                splits: [
                    { user: 'A', shareAmount: 3000 },
                    { user: 'B', shareAmount: 3000 },
                ],
            },
        ];

        const nets = computeNets(members, expenses);

        // A: +10000 - 5000 - 3000 = +2000
        // B: -5000 + 6000 - 3000 = -2000
        expect(nets.A).toBe(2000);
        expect(nets.B).toBe(-2000);
        expect(nets.A + nets.B).toBe(0);
    });

    test('payments reduce net balances correctly', () => {
        const members = [
            { id: 'A' }, { id: 'B' }, { id: 'C' },
        ];

        const expenses = [
            {
                paidBy: 'A',
                totalAmount: 30000,
                splits: [
                    { user: 'A', shareAmount: 10000 },
                    { user: 'B', shareAmount: 10000 },
                    { user: 'C', shareAmount: 10000 },
                ],
            },
        ];

        const payments = [
            { from: 'B', to: 'A', amount: 5000 },
        ];

        const nets = computeNets(members, expenses, payments);

        // A: 20000 - 5000 = 15000
        // B: -10000 + 5000 = -5000
        // C: -10000
        expect(nets.A).toBe(15000);
        expect(nets.B).toBe(-5000);
        expect(nets.C).toBe(-10000);

        const sum = Object.values(nets).reduce((a, b) => a + b, 0);
        expect(sum).toBe(0);
    });

    test('full payment zeros out balances', () => {
        const members = [
            { id: 'A' }, { id: 'B' },
        ];

        const expenses = [
            {
                paidBy: 'A',
                totalAmount: 10000,
                splits: [
                    { user: 'A', shareAmount: 5000 },
                    { user: 'B', shareAmount: 5000 },
                ],
            },
        ];

        const payments = [
            { from: 'B', to: 'A', amount: 5000 },
        ];

        const nets = computeNets(members, expenses, payments);

        expect(nets.A).toBe(0);
        expect(nets.B).toBe(0);
    });

    test('no expenses → all zero', () => {
        const members = [
            { id: 'A' }, { id: 'B' }, { id: 'C' },
        ];

        const nets = computeNets(members, []);
        expect(nets.A).toBe(0);
        expect(nets.B).toBe(0);
        expect(nets.C).toBe(0);
    });
});