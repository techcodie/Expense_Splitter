/**
 * Minimum Cash Flow Algorithm
 *
 * Takes net balances (integer paise) and produces the minimum set of
 * settlement transactions to resolve all debts.
 *
 * Algorithm:
 *   1. Filter out users with net === 0 (already settled)
 *   2. Separate into creditors (net > 0) and debtors (net < 0)
 *   3. Sort creditors descending, debtors by absolute value descending
 *   4. Greedy matching: pair largest creditor with largest debtor
 *   5. Settlement amount = min(creditor.net, abs(debtor.net))
 *   6. After each settlement, update balances and remove zeroed-out entries
 *
 * All arithmetic is integer-only — no floating-point math.
 *
 * @param {{ userId: string, name: string, email: string, net: number }[]} netBalances
 * @returns {{ from: string, to: string, fromName: string, toName: string, amount: number }[]}
 */
const minimizeTransactions = (netBalances) => {
    // 1. Build working copies, skip zero-balance users
    const creditors = []; // net > 0 (owed money)
    const debtors = [];   // net < 0 (owe money)

    for (const entry of netBalances) {
        if (entry.net > 0) {
            creditors.push({ ...entry });
        } else if (entry.net < 0) {
            debtors.push({ ...entry, net: -entry.net }); // store as positive for easier math
        }
        // net === 0 → skip
    }

    // 2. Sort: largest amounts first for optimal greedy matching
    creditors.sort((a, b) => b.net - a.net);
    debtors.sort((a, b) => b.net - a.net);

    // 3. Greedy settlement
    const settlements = [];
    let ci = 0; // creditor index
    let di = 0; // debtor index

    while (ci < creditors.length && di < debtors.length) {
        const creditor = creditors[ci];
        const debtor = debtors[di];

        // Settlement amount is the smaller of what's owed and what's due
        const settle = Math.min(creditor.net, debtor.net);

        if (settle > 0) {
            settlements.push({
                from: debtor.userId,
                to: creditor.userId,
                fromName: debtor.name,
                toName: creditor.name,
                amount: settle,
            });
        }

        // Update remaining balances
        creditor.net -= settle;
        debtor.net -= settle;

        // Move pointer if fully settled
        if (creditor.net === 0) ci++;
        if (debtor.net === 0) di++;
    }

    // 4. Integrity check — all balances should be fully resolved
    for (let i = ci; i < creditors.length; i++) {
        if (creditors[i].net !== 0) {
            throw new Error(
                `Simplification integrity error: creditor ${creditors[i].userId} has remaining balance ${creditors[i].net}`
            );
        }
    }
    for (let i = di; i < debtors.length; i++) {
        if (debtors[i].net !== 0) {
            throw new Error(
                `Simplification integrity error: debtor ${debtors[i].userId} has remaining balance ${debtors[i].net}`
            );
        }
    }

    return settlements;
};

module.exports = { minimizeTransactions };