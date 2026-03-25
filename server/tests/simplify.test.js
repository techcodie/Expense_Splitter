/**
 * simplify.test.js
 *
 * Tests for the Minimum Cash Flow algorithm (pure function — no DB).
 * All values in integer paise.
 */
const { minimizeTransactions } = require('../src/services/simplify.service');

describe('Minimum Cash Flow Algorithm', () => {
    // ── Helper: compute total owed (sum of negative nets) ──
    const totalOwed = (balances) =>
        balances.filter((b) => b.net < 0).reduce((sum, b) => sum + Math.abs(b.net), 0);

    // ── Helper: verify settlement integrity ──
    const verifySettlements = (balances, settlements) => {
        // Rebuild net effect from settlements
        // settlement.from pays settlement.to → from's net increases, to's net decreases
        const netEffect = {};
        for (const s of settlements) {
            netEffect[s.from] = (netEffect[s.from] || 0) + s.amount;  // debtor pays → net goes up
            netEffect[s.to] = (netEffect[s.to] || 0) - s.amount;      // creditor receives → net goes down
        }
        // After applying settlements, every non-zero balance should reach 0
        for (const b of balances) {
            if (b.net === 0) continue;
            const adjustment = netEffect[b.userId] || 0;
            expect(b.net + adjustment).toBe(0);
        }
    };

    test('3 members: 2 creditors, 1 debtor → correct minimal edges', () => {
        const balances = [
            { userId: 'A', name: 'Alice', net: 10000 },
            { userId: 'B', name: 'Bob', net: 5000 },
            { userId: 'C', name: 'Carol', net: -15000 },
        ];

        const result = minimizeTransactions(balances);

        // Should produce exactly 2 edges (C→A, C→B)
        expect(result).toHaveLength(2);
        expect(result[0].from).toBe('C');
        expect(result[0].to).toBe('A');
        expect(result[0].amount).toBe(10000);
        expect(result[1].from).toBe('C');
        expect(result[1].to).toBe('B');
        expect(result[1].amount).toBe(5000);

        verifySettlements(balances, result);
    });

    test('balanced group (all zero nets) → empty simplifiedGraph', () => {
        const balances = [
            { userId: 'A', name: 'Alice', net: 0 },
            { userId: 'B', name: 'Bob', net: 0 },
            { userId: 'C', name: 'Carol', net: 0 },
        ];

        const result = minimizeTransactions(balances);
        expect(result).toHaveLength(0);
    });

    test('one creditor, multiple debtors → correct settlements', () => {
        const balances = [
            { userId: 'A', name: 'Alice', net: 20000 },
            { userId: 'B', name: 'Bob', net: -8000 },
            { userId: 'C', name: 'Carol', net: -5000 },
            { userId: 'D', name: 'Dave', net: -7000 },
        ];

        const result = minimizeTransactions(balances);

        // 3 debtors, 1 creditor → 3 edges
        expect(result).toHaveLength(3);

        // Total settled should equal total owed
        const settled = result.reduce((sum, e) => sum + e.amount, 0);
        expect(settled).toBe(20000);

        // All edges go to Alice
        for (const edge of result) {
            expect(edge.to).toBe('A');
        }

        verifySettlements(balances, result);
    });

    test('transaction count reduction: many-to-many → fewer edges', () => {
        // 4 members with complex debts
        const balances = [
            { userId: 'A', name: 'Alice', net: 15000 },
            { userId: 'B', name: 'Bob', net: 5000 },
            { userId: 'C', name: 'Carol', net: -12000 },
            { userId: 'D', name: 'Dave', net: -8000 },
        ];

        const result = minimizeTransactions(balances);

        // Should be ≤ 3 edges (greedy: max = min(creditors, debtors + 1))
        expect(result.length).toBeLessThanOrEqual(3);

        verifySettlements(balances, result);
    });

    test('total net preserved after simplification', () => {
        const balances = [
            { userId: 'A', name: 'Alice', net: 30000 },
            { userId: 'B', name: 'Bob', net: -10000 },
            { userId: 'C', name: 'Carol', net: -10000 },
            { userId: 'D', name: 'Dave', net: -10000 },
        ];

        const result = minimizeTransactions(balances);

        // Sum of all settlement amounts should equal total owed
        const totalSettled = result.reduce((sum, e) => sum + e.amount, 0);
        expect(totalSettled).toBe(totalOwed(balances));
        expect(totalSettled).toBe(30000);
    });

    test('all amounts are integers (no floating point drift)', () => {
        const balances = [
            { userId: 'A', name: 'Alice', net: 33333 },
            { userId: 'B', name: 'Bob', net: -16667 },
            { userId: 'C', name: 'Carol', net: -16666 },
        ];

        const result = minimizeTransactions(balances);

        for (const edge of result) {
            expect(Number.isInteger(edge.amount)).toBe(true);
            expect(edge.amount).toBeGreaterThan(0);
        }

        const totalSettled = result.reduce((sum, e) => sum + e.amount, 0);
        expect(totalSettled).toBe(33333);
    });

    test('single pair → exactly 1 edge', () => {
        const balances = [
            { userId: 'A', name: 'Alice', net: 5000 },
            { userId: 'B', name: 'Bob', net: -5000 },
        ];

        const result = minimizeTransactions(balances);
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            from: 'B',
            to: 'A',
            amount: 5000,
        });
    });

    test('STRESS: 10 random members with valid nets summing to zero', () => {
        // Deterministic "random" distribution
        const nets = [50000, 30000, 20000, -15000, -12000, -10000, -25000, -18000, -8000, -12000];

        // Verify the test data is valid
        expect(nets.reduce((a, b) => a + b, 0)).toBe(0);

        const balances = nets.map((net, i) => ({
            userId: `user${i}`,
            name: `User ${i}`,
            net,
        }));

        const result = minimizeTransactions(balances);

        // All amounts are positive integers
        for (const edge of result) {
            expect(Number.isInteger(edge.amount)).toBe(true);
            expect(edge.amount).toBeGreaterThan(0);
        }

        // Total settled equals total owed
        const owed = totalOwed(balances);
        const settled = result.reduce((sum, e) => sum + e.amount, 0);
        expect(settled).toBe(owed);

        // All nets resolved
        verifySettlements(balances, result);

        // Transaction count should be ≤ n-1 (optimal upper bound)
        expect(result.length).toBeLessThanOrEqual(9);

        // Should actually reduce vs naive (naive = creditors * debtors = 3*7 = 21)
        expect(result.length).toBeLessThan(21);
    });
});