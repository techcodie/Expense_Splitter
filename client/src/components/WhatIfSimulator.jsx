import { useState, useMemo } from 'react';
import { Beaker, RotateCcw, AlertCircle } from 'lucide-react';
import { formatCurrency, rupeesToPaise, paiseToRupees } from '../utils/money';
import DebtGraph from './DebtGraph';

/**
 * Pure frontend implementation of minimizeTransactions (greedy algorithm).
 * Mirrors the backend simplify.service.js but runs entirely client-side.
 */
function minimizeTransactions(netBalances) {
  const creditors = [];
  const debtors = [];

  for (const entry of netBalances) {
    if (entry.net > 0) {
      creditors.push({ ...entry });
    } else if (entry.net < 0) {
      debtors.push({ ...entry, net: -entry.net });
    }
  }

  creditors.sort((a, b) => b.net - a.net);
  debtors.sort((a, b) => b.net - a.net);

  const settlements = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
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

    creditor.net -= settle;
    debtor.net -= settle;
    if (creditor.net === 0) ci++;
    if (debtor.net === 0) di++;
  }

  return settlements;
}

export default function WhatIfSimulator({ balances, members }) {
  const [enabled, setEnabled] = useState(false);
  const [simFrom, setSimFrom] = useState('');
  const [simTo, setSimTo] = useState('');
  const [simAmount, setSimAmount] = useState('');

  const debtors = balances.filter((b) => b.net < 0);
  const creditors = balances.filter((b) => b.net > 0);

  // Compute max allowed amount (paise) based on selected debtor + creditor
  const maxAllowedPaise = useMemo(() => {
    if (!simFrom || !simTo) return 0;
    const debtor = balances.find((b) => b.userId === simFrom);
    const creditor = balances.find((b) => b.userId === simTo);
    if (!debtor || !creditor) return 0;
    return Math.min(Math.abs(debtor.net), creditor.net);
  }, [simFrom, simTo, balances]);

  const maxAllowedRupees = maxAllowedPaise > 0 ? Number(paiseToRupees(maxAllowedPaise)) : 0;
  const currentPaise = rupeesToPaise(simAmount);
  const isOverMax = currentPaise > maxAllowedPaise;
  const isValid = simFrom && simTo && simFrom !== simTo && currentPaise >= 1 && !isOverMax;

  const simResult = useMemo(() => {
    if (!enabled || !isValid) return null;

    const amountPaise = currentPaise;

    // Apply hypothetical payment to balances
    const adjusted = balances.map((b) => {
      let net = b.net;
      if (b.userId === simFrom) net += amountPaise;
      if (b.userId === simTo) net -= amountPaise;
      return { ...b, net };
    });

    // Integrity: ensure no role inversion
    const fromAdjusted = adjusted.find((b) => b.userId === simFrom);
    const toAdjusted = adjusted.find((b) => b.userId === simTo);
    if (fromAdjusted && fromAdjusted.net > 0) return null; // debtor became creditor → blocked
    if (toAdjusted && toAdjusted.net < 0) return null;     // creditor became debtor → blocked

    const simGraph = minimizeTransactions(adjusted);
    return { adjustedBalances: adjusted, simplifiedGraph: simGraph };
  }, [enabled, isValid, currentPaise, simFrom, simTo, balances]);

  const reset = () => {
    setSimFrom('');
    setSimTo('');
    setSimAmount('');
  };

  if (!enabled) {
    return (
      <button
        onClick={() => setEnabled(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600/20 to-cyan-600/20 border border-purple-500/20 text-purple-300 dark:text-purple-300 text-sm font-medium hover:from-purple-600/30 hover:to-cyan-600/30 transition-all duration-300"
      >
        <Beaker size={16} />
        What-If Simulator
      </button>
    );
  }

  return (
    <div className="card border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-cyan-900/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-purple-300 flex items-center gap-2">
          <Beaker size={18} />
          What-If Payment Simulator
        </h3>
        <div className="flex gap-2">
          <button
            onClick={reset}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <RotateCcw size={12} /> Reset
          </button>
          <button
            onClick={() => { setEnabled(false); reset(); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Simulate a payment without saving — see how the debt graph changes in real-time.
      </p>

      <div className="grid sm:grid-cols-3 gap-3 mb-2">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">From (debtor)</label>
          <select
            value={simFrom}
            onChange={(e) => { setSimFrom(e.target.value); setSimAmount(''); }}
            className="input-field !py-2 text-sm"
          >
            <option value="">Select…</option>
            {debtors.map((d) => (
              <option key={d.userId} value={d.userId}>
                {d.name} (owes {formatCurrency(Math.abs(d.net))})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">To (creditor)</label>
          <select
            value={simTo}
            onChange={(e) => { setSimTo(e.target.value); setSimAmount(''); }}
            className="input-field !py-2 text-sm"
          >
            <option value="">Select…</option>
            {creditors.map((c) => (
              <option key={c.userId} value={c.userId}>
                {c.name} (owed {formatCurrency(c.net)})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Amount (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">₹</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={maxAllowedRupees || undefined}
              placeholder="0.00"
              value={simAmount}
              onChange={(e) => setSimAmount(e.target.value)}
              className={`input-field !py-2 pl-7 text-sm ${isOverMax ? '!border-red-500/50 !ring-red-500/30' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Helper: max allowed + overpayment error */}
      <div className="mb-5 h-5">
        {simFrom && simTo && maxAllowedPaise > 0 && !isOverMax && (
          <p className="text-[10px] text-gray-500">
            Max allowed: <span className="text-purple-400 font-medium">{formatCurrency(maxAllowedPaise)}</span>
          </p>
        )}
        {isOverMax && (
          <p className="text-[10px] text-red-400 flex items-center gap-1">
            <AlertCircle size={10} />
            Amount exceeds outstanding balance. Max: {formatCurrency(maxAllowedPaise)}
          </p>
        )}
      </div>

      {simResult && (
        <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Simulated Result: {simResult.simplifiedGraph.length} transaction{simResult.simplifiedGraph.length !== 1 ? 's' : ''}
          </h4>
          <DebtGraph
            nodes={members}
            edges={simResult.simplifiedGraph}
            colorTheme="purple"
            title="Simulated Simplified Graph"
          />
          <div className="mt-3 space-y-1.5">
            {simResult.simplifiedGraph.map((edge, i) => (
              <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-100 dark:bg-gray-800/50">
                <span>
                  <span className="text-red-500 dark:text-red-400">{edge.fromName}</span>
                  <span className="text-gray-400 dark:text-gray-500"> → </span>
                  <span className="text-green-600 dark:text-green-400">{edge.toName}</span>
                </span>
                <span className="font-mono text-purple-600 dark:text-purple-300">{formatCurrency(edge.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
