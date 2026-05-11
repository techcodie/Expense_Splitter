import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { formatCurrency, rupeesToPaise } from '../utils/money';
import { useAuth } from '../context/AuthContext';
import DebtGraph from '../components/DebtGraph';
import FinancialInsights from '../components/FinancialInsights';
import RiskMeter from '../components/RiskMeter';
import WhatIfSimulator from '../components/WhatIfSimulator';
import { TrendingUp, TrendingDown, Minus, Plus, CreditCard, BarChart2, Clock, Wallet, Users, Scale, AlertCircle, AlertTriangle, RefreshCw, CheckCircle2, Check, X, ArrowRight, Copy } from 'lucide-react';

const tabPanel = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

function GroupDetail() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [pendingExpenses, setPendingExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [rawGraph, setRawGraph] = useState([]);
  const [simplifiedGraph, setSimplifiedGraph] = useState([]);
  const [thresholdAlerts, setThresholdAlerts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [overdueStatuses, setOverdueStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses');

  const [payFrom, setPayFrom] = useState('');
  const [payTo, setPayTo] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payError, setPayError] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [votingExpense, setVotingExpense] = useState(null);

  const fetchAllData = useCallback(async () => {
    try {
      const [groupsRes, expensesRes, balancesRes, paymentsRes, pendingRes, overdueRes] = await Promise.all([
        api.get('/groups'),
        api.get(`/groups/${groupId}/expenses`),
        api.get(`/groups/${groupId}/balances`),
        api.get(`/groups/${groupId}/payments`),
        api.get(`/groups/${groupId}/pending-expenses`),
        api.get(`/groups/${groupId}/overdue-status`),
      ]);
      const found = groupsRes.data.data.groups.find((g) => g._id === groupId);
      setGroup(found || null);
      setExpenses(expensesRes.data.data.expenses);
      setPendingExpenses(pendingRes.data.data.expenses);
      setBalances(balancesRes.data.data.balances);
      setRawGraph(balancesRes.data.data.rawGraph);
      setSimplifiedGraph(balancesRes.data.data.simplifiedGraph);
      setThresholdAlerts(balancesRes.data.data.thresholdAlerts || []);
      setPayments(paymentsRes.data.data.payments);
      setOverdueStatuses(overdueRes.data.data.statuses);
    } catch (err) {
      console.error('Failed to load group data:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  const currentUserOverdue = overdueStatuses.find(
    (s) => s.userId === user?._id && s.status === 'overdue'
  );

  const debtTrends = useMemo(() => {
    if (expenses.length < 2) return {};
    const approved = expenses.filter((e) => e.status === 'approved');
    const sorted = [...approved].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recent = sorted.slice(0, 3);
    const trends = {};
    for (const b of balances) {
      let debtDelta = 0;
      for (const exp of recent) {
        const isDebtor = exp.splits?.some((s) => s.user?._id === b.userId || s.user === b.userId);
        const isPayer = exp.paidBy?._id === b.userId || exp.paidBy === b.userId;
        if (isDebtor && !isPayer) debtDelta--;
        if (isPayer) debtDelta++;
      }
      trends[b.userId] = debtDelta > 0 ? 'improving' : debtDelta < 0 ? 'worsening' : 'stable';
    }
    return trends;
  }, [expenses, balances]);

  const efficiencyMetrics = useMemo(() => {
    const rawTotal = rawGraph.reduce((s, e) => s + e.amount, 0);
    const simTotal = simplifiedGraph.reduce((s, e) => s + e.amount, 0);
    const reduction = rawGraph.length > 0
      ? Math.round(((rawGraph.length - simplifiedGraph.length) / rawGraph.length) * 100)
      : 0;
    return { rawTotal, simTotal, reduction };
  }, [rawGraph, simplifiedGraph]);

  const handlePayment = async (e) => {
    e.preventDefault();
    setPayError('');
    const amountPaise = rupeesToPaise(payAmount);
    if (amountPaise < 1) { setPayError('Amount must be at least ₹0.01'); return; }
    if (!payFrom || !payTo) { setPayError('Select both debtor and creditor'); return; }
    if (payFrom === payTo) { setPayError('Cannot pay yourself'); return; }
    setPaySubmitting(true);
    try {
      await api.post(`/groups/${groupId}/payments`, { from: payFrom, to: payTo, amount: amountPaise });
      toast.success(`Payment of ${formatCurrency(amountPaise)} recorded!`);
      setPayFrom(''); setPayTo(''); setPayAmount('');
      setLoading(true);
      await fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to record payment';
      setPayError(msg);
      toast.error(msg);
    } finally { setPaySubmitting(false); }
  };

  const handleVote = async (expenseId, vote) => {
    setVotingExpense(expenseId);
    try {
      await api.post(`/expenses/${expenseId}/vote`, { vote });
      toast.success(`Vote "${vote}" submitted`);
      setLoading(true);
      await fetchAllData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to vote');
    } finally { setVotingExpense(null); }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-center">
        <p className="text-red-500">Group not found.</p>
        <Link to="/dashboard" className="text-teal-500 text-sm mt-2 inline-block">← Back to Dashboard</Link>
      </div>
    );
  }

  const debtors = balances.filter((b) => b.net < 0);
  const creditors = balances.filter((b) => b.net > 0);
  const threshold = group.settlementThreshold || 0;

  const tabs = [
    { key: 'expenses', label: 'Expenses', icon: Wallet, count: expenses.length },
    { key: 'pending', label: 'Pending', icon: Clock, count: pendingExpenses.length },
    { key: 'balances', label: 'Balances', icon: BarChart2 },
    { key: 'payments', label: 'Payments', icon: CreditCard, count: payments.length },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
      >
        <div>
          <Link to="/dashboard" className="text-gray-600 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 text-sm mb-2 inline-block font-medium transition-colors">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">{group.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="inline-flex items-center gap-1.5"><Users size={13} /> {group.members?.length} members</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(group.joinCode);
                toast.success(`Copied "${group.joinCode}" — share with friends to join`);
              }}
              className="group/code inline-flex items-center gap-1.5 font-mono bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 pl-2.5 pr-2 py-1 rounded-lg text-xs border border-teal-200 dark:border-teal-500/30 hover:bg-teal-100 dark:hover:bg-teal-500/20 hover:border-teal-300 dark:hover:border-teal-500/50 transition-colors"
              title="Click to copy invite code"
            >
              <span>{group.joinCode}</span>
              <Copy size={11} className="opacity-70 group-hover/code:opacity-100" />
            </button>
            {threshold > 0 && (
              <span className="inline-flex items-center gap-1.5"><Scale size={13} /> Threshold: {formatCurrency(threshold)}</span>
            )}
          </div>
        </div>
        {currentUserOverdue ? (
          <div className="mt-4 sm:mt-0 px-4 py-2.5 rounded-xl bg-red-100 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 text-sm font-medium inline-flex items-center gap-2">
            <AlertCircle size={15} /> You are OVERDUE — pay debts to regain access
          </div>
        ) : (
          <Link to={`/groups/${groupId}/add-expense`} className="btn-primary text-sm mt-4 sm:mt-0 gap-1.5">
            <Plus size={16} /> Add Expense
          </Link>
        )}
      </motion.div>

      {/* Members */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex flex-wrap gap-2">
          {group.members?.map((m) => {
            const memberOverdue = overdueStatuses.find((s) => s.userId === m._id && s.status === 'overdue');
            const trend = debtTrends[m._id];
            const isYou = m._id === user?._id;
            return (
              <motion.span
                key={m._id}
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-200 ${
                  memberOverdue
                    ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300'
                    : isYou
                      ? 'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/30 text-teal-700 dark:text-teal-300'
                      : 'bg-white dark:bg-white/[0.03] border-gray-200 dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:border-teal-300 dark:hover:border-teal-500/30'
                }`}
              >
                <span>{m.name}{isYou ? ' (You)' : ''}</span>
                {memberOverdue && <AlertCircle size={11} className="text-red-500" />}
                {trend === 'improving' && <TrendingUp size={11} className="text-emerald-500" />}
                {trend === 'worsening' && <TrendingDown size={11} className="text-red-500" />}
                {trend === 'stable' && <Minus size={11} className="text-gray-400" />}
              </motion.span>
            );
          })}
        </div>
      </motion.section>

      {/* Threshold Alerts */}
      {thresholdAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30"
        >
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 inline-flex items-center gap-1.5">
            <AlertTriangle size={14} /> Settlement Alerts
          </h3>
          <div className="space-y-1">
            {thresholdAlerts.map((alert) => (
              <p key={alert.userId} className="text-sm text-amber-800 dark:text-amber-200">
                <span className="font-medium">{alert.name}</span> owes {formatCurrency(alert.amountOwed)} (exceeds threshold)
              </p>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tab Toggle */}
      <div className="relative flex gap-1.5 mb-6 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${
              activeTab === tab.key
                ? 'text-white'
                : 'bg-gray-100 dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.08] hover:text-gray-900 dark:hover:text-gray-200 border border-gray-200 dark:border-white/[0.08]'
            }`}
          >
            {activeTab === tab.key && (
              <motion.span
                layoutId="group-tab-pill"
                className="absolute inset-0 rounded-xl bg-teal-600 -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <tab.icon size={15} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700/80'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabPanel}
          initial="hidden"
          animate="show"
          exit="exit"
        >
          {/* ───── EXPENSES TAB ───── */}
          {activeTab === 'expenses' && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">All Expenses</h2>
              {expenses.length === 0 ? (
                <div className="card text-center py-12">
                  <Wallet size={40} className="text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">No expenses yet</h3>
                  <p className="text-sm text-gray-500 mb-4">Add your first expense to start tracking.</p>
                  {!currentUserOverdue && (
                    <Link to={`/groups/${groupId}/add-expense`} className="btn-primary text-sm">+ Add Expense</Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((exp) => (
                    <motion.div
                      key={exp._id}
                      whileHover={{ y: -2 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                      className="card !p-4 hover:border-teal-300 dark:hover:border-teal-500/30 hover:shadow-md transition-colors duration-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-50 truncate">{exp.description}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                              exp.status === 'approved' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                : exp.status === 'rejected' ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                                : 'bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                            }`}>
                              {exp.status}
                            </span>
                            {exp.isRecurring && (
                              <span className="text-[10px] bg-fuchsia-100 dark:bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 px-2 py-0.5 rounded-full border border-fuchsia-200 dark:border-fuchsia-500/20 inline-flex items-center gap-1">
                                <RefreshCw size={9} /> {exp.recurrence?.frequency}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                            Paid by <span className="text-teal-600 dark:text-teal-300 font-medium">{exp.paidBy?.name}</span>
                          </p>
                        </div>
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">{formatCurrency(exp.totalAmount)}</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.05]">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {exp.splits?.map((s) => (
                            <div key={s._id} className="flex items-center justify-between gap-2 bg-gray-50 dark:bg-white/[0.03] rounded-lg px-3 py-1.5 text-xs">
                              <span className="text-gray-700 dark:text-gray-300 truncate">{s.user?.name}</span>
                              <span className="text-gray-500 font-mono tabular-nums shrink-0">{formatCurrency(s.shareAmount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-2">{new Date(exp.createdAt).toLocaleString()}</p>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ───── PENDING TAB ───── */}
          {activeTab === 'pending' && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Pending Approval ({pendingExpenses.length})</h2>
              {pendingExpenses.length === 0 ? (
                <div className="card text-center py-12">
                  <Clock size={40} className="text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2">No pending expenses</h3>
                  <p className="text-sm text-gray-500">All expenses have been reviewed.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingExpenses.map((exp) => {
                    const approveCount = exp.approvals?.filter((a) => a.vote === 'approve').length || 0;
                    const rejectCount = exp.approvals?.filter((a) => a.vote === 'reject').length || 0;
                    const totalVotes = exp.approvals?.length || 0;
                    const required = exp.requiredApprovals || 1;
                    const alreadyVoted = exp.approvals?.some((a) => a.user?._id === user?._id);
                    const progress = Math.min((approveCount / required) * 100, 100);

                    return (
                      <div key={exp._id} className="card !p-5 border-amber-200 dark:border-amber-500/20 bg-amber-50/40 dark:bg-amber-500/5">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-base">{exp.description}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                              Created by <span className="text-teal-600 dark:text-teal-300">{exp.createdBy?.name}</span>
                              {' • '}Paid by <span className="text-teal-600 dark:text-teal-300">{exp.paidBy?.name}</span>
                            </p>
                          </div>
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(exp.totalAmount)}</span>
                        </div>

                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-gray-700 dark:text-gray-300">
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{approveCount}</span> / {required} approvals
                              {rejectCount > 0 && <span className="text-red-500 dark:text-red-400 ml-2">({rejectCount} rejected)</span>}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">{totalVotes} total votes</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800/80 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className="h-full rounded-full bg-gradient-to-r from-teal-500 via-teal-500 to-emerald-500"
                            />
                          </div>
                        </div>

                        {exp.approvals?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {exp.approvals.map((a, i) => (
                              <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                a.vote === 'approve' ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                              }`}>
                                {a.user?.name}: {a.vote === 'approve' ? 'approved' : 'rejected'}
                              </span>
                            ))}
                          </div>
                        )}

                        {!alreadyVoted && !currentUserOverdue ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleVote(exp._id, 'approve')}
                              disabled={votingExpense === exp._id}
                              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all duration-200 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                            >
                              <Check size={15} /> Approve
                            </button>
                            <button
                              onClick={() => handleVote(exp._id, 'reject')}
                              disabled={votingExpense === exp._id}
                              className="flex-1 py-2.5 px-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-all duration-200 disabled:opacity-50 inline-flex items-center justify-center gap-2"
                            >
                              <X size={15} /> Reject
                            </button>
                          </div>
                        ) : alreadyVoted ? (
                          <p className="text-xs text-gray-500 italic">You have already voted.</p>
                        ) : (
                          <p className="text-xs text-red-500 italic">Overdue users cannot vote.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ───── BALANCES TAB ───── */}
          {activeTab === 'balances' && (
            <div className="space-y-8">
              <FinancialInsights
                expenses={expenses}
                balances={balances}
                rawGraph={rawGraph}
                simplifiedGraph={simplifiedGraph}
                overdueStatuses={overdueStatuses}
                threshold={threshold}
              />

              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Net Balances</h2>
                {balances.length === 0 || balances.every((b) => b.net === 0) ? (
                  <div className="card text-center py-10">
                    <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-gray-500">All settled!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {balances.slice().sort((a, b) => b.net - a.net).map((b) => {
                      const isOverdue = overdueStatuses.find((s) => s.userId === b.userId && s.status === 'overdue');
                      const trend = debtTrends[b.userId];
                      return (
                        <div key={b.userId} className="card !p-4 hover:border-teal-300 dark:hover:border-teal-500/30 transition-all duration-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900 dark:text-gray-50 font-medium">{b.name}</span>
                              {isOverdue && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 font-semibold border border-red-200 dark:border-red-500/30">
                                  OVERDUE
                                </span>
                              )}
                              {trend === 'improving' && <TrendingUp size={14} className="text-emerald-500" />}
                              {trend === 'worsening' && <TrendingDown size={14} className="text-red-500" />}
                              {trend === 'stable' && <Minus size={14} className="text-gray-400" />}
                            </div>
                            <div className="text-right">
                              <span className={`text-base font-bold font-mono tabular-nums ${
                                b.net > 0 ? 'text-emerald-600 dark:text-emerald-400' : b.net < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
                              }`}>
                                {b.net > 0 ? '+' : ''}{formatCurrency(Math.abs(b.net))}
                              </span>
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                b.net > 0 ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                  : b.net < 0 ? 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                              }`}>
                                {b.net > 0 ? 'Gets back' : b.net < 0 ? 'Owes' : 'Settled'}
                              </span>
                            </div>
                          </div>
                          <RiskMeter net={b.net} threshold={threshold} name={b.name} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Settlement Efficiency */}
              {rawGraph.length > 0 && (
                <div className="card bg-gradient-to-br from-teal-50 via-teal-50 to-sky-50 dark:from-teal-500/10 dark:via-teal-500/10 dark:to-sky-500/10 border-teal-200 dark:border-teal-500/20">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-5 text-center uppercase tracking-wider">Settlement Efficiency Analysis</h3>
                  <div className="flex flex-wrap items-center justify-center gap-10 text-center mb-4">
                    <div>
                      <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{rawGraph.length}</p>
                      <p className="text-xs text-gray-500 mt-1">Raw Transactions</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatCurrency(efficiencyMetrics.rawTotal)} moved</p>
                    </div>
                    <div className="text-3xl text-gray-300 dark:text-gray-700">→</div>
                    <div>
                      <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{simplifiedGraph.length}</p>
                      <p className="text-xs text-gray-500 mt-1">Simplified</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatCurrency(efficiencyMetrics.simTotal)} moved</p>
                    </div>
                    <div className="text-3xl text-gray-300 dark:text-gray-700">→</div>
                    <div>
                      <p className="text-3xl font-bold gradient-text tabular-nums">{efficiencyMetrics.reduction}%</p>
                      <p className="text-xs text-gray-500 mt-1">Reduction</p>
                    </div>
                  </div>
                  <p className="text-center text-xs text-gray-500">
                    Coordination complexity reduced by <span className="text-teal-600 dark:text-teal-400 font-medium">{efficiencyMetrics.reduction}%</span>
                  </p>
                </div>
              )}

              {/* Debt Graphs */}
              <div className="grid md:grid-cols-2 gap-6">
                <DebtGraph nodes={group.members} edges={rawGraph} colorTheme="orange" title="Before Simplification" />
                <DebtGraph nodes={group.members} edges={simplifiedGraph} colorTheme="green" title="After Simplification" />
              </div>

              <WhatIfSimulator balances={balances} members={group.members} />

              {simplifiedGraph.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-3">
                    Simplified Settlements ({simplifiedGraph.length})
                  </h2>
                  <div className="space-y-2">
                    {simplifiedGraph.map((edge, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ x: 2 }}
                        className="card !p-3.5 flex items-center justify-between hover:border-teal-300 dark:hover:border-teal-500/30 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm min-w-0">
                          <span className="text-red-600 dark:text-red-400 font-medium truncate">{edge.fromName}</span>
                          <ArrowRight size={14} className="text-gray-400 shrink-0" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate">{edge.toName}</span>
                        </div>
                        <span className="font-mono font-semibold text-teal-600 dark:text-teal-300 tabular-nums shrink-0 ml-3">{formatCurrency(edge.amount)}</span>
                      </motion.div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ───── PAYMENTS TAB ───── */}
          {activeTab === 'payments' && (
            <div className="space-y-8">
              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Record Payment</h2>
                <div className="card">
                  <AnimatePresence>
                    {payError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm"
                      >
                        {payError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <form onSubmit={handlePayment} className="space-y-4">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">From (owes)</label>
                        <select value={payFrom} onChange={(e) => setPayFrom(e.target.value)} className="input-field">
                          <option value="">Select debtor</option>
                          {debtors.map((d) => (
                            <option key={d.userId} value={d.userId}>{d.name} (owes {formatCurrency(Math.abs(d.net))})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">To (is owed)</label>
                        <select value={payTo} onChange={(e) => setPayTo(e.target.value)} className="input-field">
                          <option value="">Select creditor</option>
                          {creditors.map((c) => (
                            <option key={c.userId} value={c.userId}>{c.name} (owed {formatCurrency(c.net)})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount (₹)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
                          <input type="number" min="0.01" step="0.01" placeholder="0.00" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="input-field pl-8" />
                        </div>
                      </div>
                    </div>
                    <button type="submit" disabled={paySubmitting} className="btn-primary disabled:opacity-50 gap-2">
                      {paySubmitting ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Recording…
                        </span>
                      ) : (
                        <><CreditCard size={16} /> Record Payment</>
                      )}
                    </button>
                  </form>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">Payment History ({payments.length})</h2>
                {payments.length === 0 ? (
                  <div className="card text-center py-10">
                    <CreditCard size={40} className="text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-500">No payments recorded yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => (
                      <motion.div
                        key={p._id}
                        whileHover={{ x: 2 }}
                        className="card !p-3.5 flex items-center justify-between hover:border-teal-300 dark:hover:border-teal-500/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm min-w-0">
                            <span className="text-red-600 dark:text-red-400 font-medium truncate">{p.from?.name}</span>
                            <span className="text-gray-400 text-xs shrink-0">paid</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium truncate">{p.to?.name}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(p.createdAt).toLocaleString()}
                            {p.createdBy && ` • by ${p.createdBy.name}`}
                          </p>
                        </div>
                        <span className="font-mono font-semibold text-teal-600 dark:text-teal-300 tabular-nums shrink-0 ml-3">{formatCurrency(p.amount)}</span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Floating Action Button */}
      {!currentUserOverdue && (
        <motion.div
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.3 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <Link
            to={`/groups/${groupId}/add-expense`}
            className="flex items-center justify-center w-14 h-14 rounded-full bg-teal-600 text-white shadow-md shadow-teal-600/25 hover:bg-teal-700 hover:scale-105 active:scale-95 transition-all duration-200"
            aria-label="Add Expense"
          >
            <Plus size={26} strokeWidth={2.4} />
          </Link>
        </motion.div>
      )}
    </div>
  );
}

export default GroupDetail;
