/**
 * threshold.test.js
 *
 * Tests for the threshold alert logic (pure function — no DB).
 * Uses computeThresholdAlerts directly from balance.service.js.
 */
const { computeThresholdAlerts } = require('../src/services/balance.service');

describe('Threshold Alert Logic', () => {
    const balances = [
        { userId: 'A', name: 'Alice', net: 10000 },   // creditor +₹100
        { userId: 'B', name: 'Bob', net: -6000 },   // debtor -₹60
        { userId: 'C', name: 'Carol', net: -4000 },   // debtor -₹40
    ];

    test('debtor exceeding threshold triggers alert', () => {
        // Threshold = 5000 paise (₹50)
        const alerts = computeThresholdAlerts(balances, 5000);

        // Only Bob (-6000) exceeds 5000 threshold
        expect(alerts).toHaveLength(1);
        expect(alerts[0].userId).toBe('B');
        expect(alerts[0].amountOwed).toBe(6000);
    });

    test('debtor below threshold does NOT trigger alert', () => {
        const alerts = computeThresholdAlerts(balances, 5000);

        // Carol (-4000) is below 5000 threshold
        const carolAlert = alerts.find((a) => a.userId === 'C');
        expect(carolAlert).toBeUndefined();
    });

    test('creditor never triggers alert', () => {
        const alerts = computeThresholdAlerts(balances, 0);

        // Alice (net > 0) should never appear
        const aliceAlert = alerts.find((a) => a.userId === 'A');
        expect(aliceAlert).toBeUndefined();
    });

    test('threshold = 0: all debtors trigger alerts', () => {
        const alerts = computeThresholdAlerts(balances, 0);

        expect(alerts).toHaveLength(2);
        const userIds = alerts.map((a) => a.userId);
        expect(userIds).toContain('B');
        expect(userIds).toContain('C');
    });

    test('alert disappears after partial payment reduces debt below threshold', () => {
        // Simulate: Bob originally -6000, makes 2000 payment → -4000
        const updatedBalances = [
            { userId: 'A', name: 'Alice', net: 8000 },   // reduced
            { userId: 'B', name: 'Bob', net: -4000 },  // after payment
            { userId: 'C', name: 'Carol', net: -4000 },
        ];

        const alerts = computeThresholdAlerts(updatedBalances, 5000);

        // Bob at -4000 is now below 5000 threshold → no alert
        expect(alerts).toHaveLength(0);
    });

    test('alert increases sort correctly (largest debt first)', () => {
        const moreBalances = [
            { userId: 'A', name: 'Alice', net: 20000 },
            { userId: 'B', name: 'Bob', net: -3000 },
            { userId: 'C', name: 'Carol', net: -8000 },
            { userId: 'D', name: 'Dave', net: -9000 },
        ];

        const alerts = computeThresholdAlerts(moreBalances, 0);

        expect(alerts).toHaveLength(3);
        // Sorted descending by amountOwed
        expect(alerts[0].userId).toBe('D');
        expect(alerts[0].amountOwed).toBe(9000);
        expect(alerts[1].userId).toBe('C');
        expect(alerts[1].amountOwed).toBe(8000);
        expect(alerts[2].userId).toBe('B');
        expect(alerts[2].amountOwed).toBe(3000);
    });

    test('exact threshold boundary: debt === threshold triggers alert', () => {
        const borderBalances = [
            { userId: 'A', name: 'Alice', net: 5000 },
            { userId: 'B', name: 'Bob', net: -5000 },
        ];

        const alerts = computeThresholdAlerts(borderBalances, 5000);
        expect(alerts).toHaveLength(1);
        expect(alerts[0].userId).toBe('B');
    });

    test('all settled (zero nets) → no alerts', () => {
        const zeroBalances = [
            { userId: 'A', name: 'Alice', net: 0 },
            { userId: 'B', name: 'Bob', net: 0 },
        ];

        const alerts = computeThresholdAlerts(zeroBalances, 0);
        expect(alerts).toHaveLength(0);
    });

    test('amountOwed is always a positive integer', () => {
        const alerts = computeThresholdAlerts(balances, 0);

        for (const alert of alerts) {
            expect(alert.amountOwed).toBeGreaterThan(0);
            expect(Number.isInteger(alert.amountOwed)).toBe(true);
        }
    });
});