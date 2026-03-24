import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  ArrowDownRight,
  Crown,
  Repeat,
} from 'lucide-react';
import { formatCurrency } from '../utils/money';

function StatCard({ icon: Icon, label, value, color = 'primary', subtext }) {
  const colorMap = {
    primary: 'from-primary-500/15 to-primary-600/5 border-primary-300 dark:border-primary-500/20',
    green: 'from-green-500/15 to-green-600/5 border-green-300 dark:border-green-500/20',
    orange: 'from-orange-500/15 to-orange-600/5 border-orange-300 dark:border-orange-500/20',
    red: 'from-red-500/15 to-red-600/5 border-red-300 dark:border-red-500/20',
    purple: 'from-purple-500/15 to-purple-600/5 border-purple-300 dark:border-purple-500/20',
    cyan: 'from-cyan-500/15 to-cyan-600/5 border-cyan-300 dark:border-cyan-500/20',
  };

  const textColorMap = {
    primary: 'text-primary-600 dark:text-primary-400',
    green: 'text-green-600 dark:text-green-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
    purple: 'text-purple-600 dark:text-purple-400',
    cyan: 'text-cyan-600 dark:text-cyan-400',
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${colorMap[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{label}</p>
          <p className={`text-2xl font-bold ${textColorMap[color]}`}>
            {value}
          </p>
          {subtext && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-2.5 rounded-xl bg-white/30 dark:bg-white/5 ${textColorMap[color]}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-10 dark:opacity-20 ${
        color === 'primary' ? 'bg-primary-500' :
        color === 'green' ? 'bg-green-500' :
        color === 'orange' ? 'bg-orange-500' :
        color === 'red' ? 'bg-red-500' :
        color === 'purple' ? 'bg-purple-500' : 'bg-cyan-500'
      }`} />
    </div>
  );
}

export default function FinancialInsights({ expenses, balances, rawGraph, simplifiedGraph, overdueStatuses, threshold }) {
  const stats = useMemo(() => {
    const approvedExpenses = expenses.filter((e) => e.status === 'approved');
    const totalSpending = approvedExpenses.reduce((s, e) => s + e.totalAmount, 0);

    const topCreditor = balances.reduce(
      (top, b) => (b.net > (top?.net || 0) ? b : top),
      null
    );

    const payerCounts = {};
    for (const e of approvedExpenses) {
      const name = e.paidBy?.name || 'Unknown';
      payerCounts[name] = (payerCounts[name] || 0) + 1;
    }
    const frequentPayer = Object.entries(payerCounts).sort((a, b) => b[1] - a[1])[0];

    const nearThreshold = threshold > 0
      ? balances.filter((b) => b.net < 0 && Math.abs(b.net) >= threshold * 0.8).length
      : 0;

    const overdueCount = overdueStatuses.filter((s) => s.status === 'overdue').length;

    const reduction = rawGraph.length > 0
      ? Math.round(((rawGraph.length - simplifiedGraph.length) / rawGraph.length) * 100)
      : 0;

    return { totalSpending, topCreditor, frequentPayer, nearThreshold, overdueCount, reduction };
  }, [expenses, balances, rawGraph, simplifiedGraph, overdueStatuses, threshold]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <StatCard
        icon={Wallet}
        label="Total Spending"
        value={formatCurrency(stats.totalSpending)}
        color="primary"
        subtext={`${expenses.filter((e) => e.status === 'approved').length} approved expenses`}
      />
      <StatCard
        icon={Crown}
        label="Top Contributor"
        value={stats.topCreditor?.name || 'None'}
        color="green"
        subtext={stats.topCreditor ? `+${formatCurrency(stats.topCreditor.net)} net` : ''}
      />
      <StatCard
        icon={Repeat}
        label="Most Frequent Payer"
        value={stats.frequentPayer ? stats.frequentPayer[0] : 'None'}
        color="purple"
        subtext={stats.frequentPayer ? `${stats.frequentPayer[1]} expense${stats.frequentPayer[1] > 1 ? 's' : ''}` : ''}
      />
      <StatCard
        icon={AlertTriangle}
        label="Near Threshold"
        value={stats.nearThreshold}
        color={stats.nearThreshold > 0 ? 'orange' : 'cyan'}
        subtext="Members ≥ 80% of limit"
      />
      <StatCard
        icon={stats.overdueCount > 0 ? TrendingDown : TrendingUp}
        label="Overdue Members"
        value={stats.overdueCount}
        color={stats.overdueCount > 0 ? 'red' : 'green'}
        subtext={stats.overdueCount > 0 ? 'Action required' : 'All active'}
      />
      <StatCard
        icon={ArrowDownRight}
        label="Transaction Reduction"
        value={`${stats.reduction}%`}
        color="cyan"
        subtext={`${rawGraph.length} → ${simplifiedGraph.length} transactions`}
      />
    </div>
  );
}
