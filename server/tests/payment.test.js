/**
 * payment.test.js
 *
 * Tests for payment validation logic.
 * Tests the pure validation rules without DB dependency.
 */
const { isValidPaise } = require('../src/utils/money');

describe('Payment Validation Logic', () => {
    /**
     * Simulates the payment validation chain from payment.service.js
     * without DB calls.
     */
    function validatePayment(balances, fromUserId, toUserId, amount, memberIds) {
        const errors = [];

        // From is member
        if (!memberIds.includes(fromUserId)) {
            errors.push({ code: 400, msg: 'Debtor is not a member' });
        }

        // To is member
        if (!memberIds.includes(toUserId)) {
            errors.push({ code: 400, msg: 'Creditor is not a member' });
        }

        // Self-payment
        if (fromUserId === toUserId) {
            errors.push({ code: 400, msg: 'Cannot pay yourself' });
        }

        // Amount validation
        if (!isValidPaise(amount) || amount < 1) {
            errors.push({ code: 400, msg: 'Invalid amount' });
        }

        if (errors.length > 0) return errors;

        // Role checks
        const debtorBalance = balances.find((b) => b.userId === fromUserId);
        const creditorBalance = balances.find((b) => b.userId === toUserId);

        if (!debtorBalance || debtorBalance.net >= 0) {
            errors.push({ code: 400, msg: 'Selected user does not owe money' });
        }

        if (!creditorBalance || creditorBalance.net <= 0) {
            errors.push({ code: 400, msg: 'Selected user is not owed money' });
        }

        if (errors.length > 0) return errors;

        // Overpayment
        const maxPayable = Math.min(Math.abs(debtorBalance.net), creditorBalance.net);
        if (amount > maxPayable) {
            errors.push({ code: 400, msg: `Overpayment: ${amount} > ${maxPayable}` });
        }

        return errors;
    }

    const mockBalances = [
        { userId: 'A', name: 'Alice', net: 10000 },   // creditor
        { userId: 'B', name: 'Bob', net: -7000 },   // debtor
        { userId: 'C', name: 'Carol', net: -3000 },   // debtor
    ];
    const memberIds = ['A', 'B', 'C'];

    test('valid partial payment → no errors', () => {
        const errors = validatePayment(mockBalances, 'B', 'A', 5000, memberIds);
        expect(errors).toHaveLength(0);
    });

    test('valid full payment → no errors', () => {
        const errors = validatePayment(mockBalances, 'B', 'A', 7000, memberIds);
        expect(errors).toHaveLength(0);
    });

    test('overpayment → rejected', () => {
        // Bob owes 7000, trying to pay 8000
        const errors = validatePayment(mockBalances, 'B', 'A', 8000, memberIds);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].msg).toContain('Overpayment');
    });

    test('self-payment → rejected', () => {
        const errors = validatePayment(mockBalances, 'A', 'A', 1000, memberIds);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((e) => e.msg.includes('yourself'))).toBe(true);
    });

    test('creditor paying creditor → rejected (no creditor as debtor role)', () => {
        // A is creditor (net > 0), trying to pay FROM A
        const errors = validatePayment(mockBalances, 'A', 'B', 1000, memberIds);
        expect(errors.length).toBeGreaterThan(0);
        // A doesn't owe money
        expect(errors.some((e) => e.msg.includes('does not owe'))).toBe(true);
    });

    test('debtor paying debtor → rejected (no debtor as creditor role)', () => {
        // B is debtor, C is debtor — B trying to pay C
        const errors = validatePayment(mockBalances, 'B', 'C', 1000, memberIds);
        expect(errors.length).toBeGreaterThan(0);
        // C is not owed money
        expect(errors.some((e) => e.msg.includes('not owed'))).toBe(true);
    });

    test('zero amount → rejected', () => {
        const errors = validatePayment(mockBalances, 'B', 'A', 0, memberIds);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((e) => e.msg.includes('Invalid amount'))).toBe(true);
    });

    test('negative amount → rejected', () => {
        const errors = validatePayment(mockBalances, 'B', 'A', -1000, memberIds);
        expect(errors.length).toBeGreaterThan(0);
    });

    test('floating point amount → rejected', () => {
        const errors = validatePayment(mockBalances, 'B', 'A', 100.5, memberIds);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((e) => e.msg.includes('Invalid amount'))).toBe(true);
    });

    test('non-member from → rejected', () => {
        const errors = validatePayment(mockBalances, 'X', 'A', 1000, memberIds);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((e) => e.msg.includes('not a member'))).toBe(true);
    });

    test('non-member to → rejected', () => {
        const errors = validatePayment(mockBalances, 'B', 'X', 1000, memberIds);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some((e) => e.msg.includes('not a member'))).toBe(true);
    });

    test('overpayment boundary: exactly max → valid', () => {
        // B owes 7000, A owed 10000 → max = min(7000, 10000) = 7000
        const errors = validatePayment(mockBalances, 'B', 'A', 7000, memberIds);
        expect(errors).toHaveLength(0);
    });

    test('overpayment boundary: max + 1 → rejected', () => {
        const errors = validatePayment(mockBalances, 'B', 'A', 7001, memberIds);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].msg).toContain('Overpayment');
    });
});