import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { formatCurrency } from '../utils/money';
import { Users, Plus, UserPlus, Wallet, ArrowDownRight, Clock, TrendingUp, RefreshCw, CheckCircle2, ArrowRight, Copy } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

function StatCard({ label, value, icon: Icon, gradient, textColor, iconBg, stripeColor, currency = true, decimals = 2 }) {
  const numericValue = currency ? value / 100 : value;
  return (
    <motion.div
      variants={item}
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className={`relative rounded-2xl border bg-gradient-to-br ${gradient} p-4 backdrop-blur-sm transition-shadow duration-200 hover:shadow-lg overflow-hidden`}
    >
      <span className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${stripeColor}`} />
      <div className="flex items-start justify-between mb-3 pl-2">
        <span className="text-xs text-gray-700 dark:text-gray-300 uppercase tracking-wider font-medium">
          {label}
        </span>
        <span className={`p-1.5 rounded-lg ${iconBg}`}>
          <Icon size={14} className={textColor} />
        </span>
      </div>
      <p className={`text-2xl font-bold tabular-nums pl-2 ${textColor}`}>
        {currency ? (
          <CountUp
            start={0}
            end={numericValue}
            decimals={decimals}
            duration={1.2}
            separator=","
            prefix="₹"
            preserveValue
          />
        ) : (
          <CountUp start={0} end={numericValue} duration={1.0} preserveValue />
        )}
      </p>
    </motion.div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [pendingSettlements, setPendingSettlements] = useState([]);
  const [allBalances, setAllBalances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/groups');
        const fetchedGroups = res.data.data.groups;
        setGroups(fetchedGroups);

        const allExpenses = [];
        const allSettlements = [];
        const balancesList = [];

        await Promise.all(
          fetchedGroups.map(async (g) => {
            try {
              const [expRes, balRes] = await Promise.all([
                api.get(`/groups/${g._id}/expenses`),
                api.get(`/groups/${g._id}/balances`),
              ]);

              for (const exp of expRes.data.data.expenses) {
                allExpenses.push({ ...exp, groupName: g.name, groupId: g._id });
              }

              const simplified = balRes.data.data.simplifiedGraph || [];
              for (const edge of simplified) {
                if (edge.from === user?._id || edge.to === user?._id) {
                  allSettlements.push({ ...edge, groupName: g.name, groupId: g._id });
                }
              }

              for (const b of balRes.data.data.balances || []) {
                if (b.userId === user?._id) {
                  balancesList.push({ ...b, groupName: g.name });
                }
              }
            } catch {
              // Skip groups that fail
            }
          })
        );

        allExpenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRecentExpenses(allExpenses.slice(0, 5));
        setPendingSettlements(allSettlements);
        setAllBalances(balancesList);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const overview = useMemo(() => {
    const totalOwed = allBalances.filter((b) => b.net > 0).reduce((s, b) => s + b.net, 0);
    const totalOwe = allBalances.filter((b) => b.net < 0).reduce((s, b) => s + Math.abs(b.net), 0);
    const netPosition = totalOwed - totalOwe;
    return { totalOwed, totalOwe, netPosition };
  }, [allBalances]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold mb-1">
            Welcome, <span className="gradient-text">{user?.name}</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300">Your groups and expenses at a glance.</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <Link to="/groups/create" className="btn-primary text-sm gap-1.5">
            <Plus size={16} /> Create Group
          </Link>
          <Link to="/groups/join" className="btn-secondary text-sm gap-1.5">
            <UserPlus size={16} /> Join Group
          </Link>
        </div>
      </motion.div>

      {/* Financial Overview Cards */}
      {!loading && groups.length > 0 && (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <StatCard
            label="Groups"
            value={groups.length}
            icon={Users}
            gradient="from-teal-100 to-teal-50/40 dark:from-teal-500/15 dark:to-teal-600/5 border-teal-200 dark:border-teal-500/20"
            textColor="text-teal-600 dark:text-teal-400"
            iconBg="bg-teal-200/60 dark:bg-teal-500/20"
            stripeColor="bg-teal-500"
            currency={false}
          />
          <StatCard
            label="Owed to You"
            value={overview.totalOwed}
            icon={TrendingUp}
            gradient="from-emerald-100 to-emerald-50/40 dark:from-emerald-500/15 dark:to-emerald-600/5 border-emerald-200 dark:border-emerald-500/20"
            textColor="text-emerald-600 dark:text-emerald-400"
            iconBg="bg-emerald-200/60 dark:bg-emerald-500/20"
            stripeColor="bg-emerald-500"
          />
          <StatCard
            label="You Owe"
            value={overview.totalOwe}
            icon={ArrowDownRight}
            gradient="from-red-100 to-red-50/40 dark:from-red-500/15 dark:to-red-600/5 border-red-200 dark:border-red-500/20"
            textColor="text-red-600 dark:text-red-400"
            iconBg="bg-red-200/60 dark:bg-red-500/20"
            stripeColor="bg-red-500"
          />
          <StatCard
            label="Net Position"
            value={Math.abs(overview.netPosition)}
            icon={Wallet}
            gradient={
              overview.netPosition >= 0
                ? 'from-sky-100 to-sky-50/40 dark:from-sky-500/15 dark:to-sky-600/5 border-sky-200 dark:border-sky-500/20'
                : 'from-amber-100 to-amber-50/40 dark:from-amber-500/15 dark:to-amber-600/5 border-amber-200 dark:border-amber-500/20'
            }
            textColor={overview.netPosition >= 0 ? 'text-sky-600 dark:text-sky-400' : 'text-amber-600 dark:text-amber-400'}
            iconBg={overview.netPosition >= 0 ? 'bg-sky-200/60 dark:bg-sky-500/20' : 'bg-amber-200/60 dark:bg-amber-500/20'}
            stripeColor={overview.netPosition >= 0 ? 'bg-sky-500' : 'bg-amber-500'}
          />
        </motion.div>
      )}

      {/* Groups */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-50">My Groups</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-10 h-10 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="card text-center py-12">
            <Users size={40} className="text-gray-400 dark:text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">No groups yet</h3>
            <p className="text-sm text-gray-500 mb-4">Create a group or join one to get started.</p>
            <div className="flex justify-center gap-3">
              <Link to="/groups/create" className="btn-primary text-sm">Create Group</Link>
              <Link to="/groups/join" className="btn-secondary text-sm">Join Group</Link>
            </div>
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {groups.map((group) => {
              const memberCount = group.members?.length || 0;
              return (
                <motion.div
                  key={group._id}
                  variants={item}
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                >
                  <Link
                    to={`/groups/${group._id}`}
                    className="card hover:border-teal-300 dark:hover:border-teal-500/30 hover:shadow-lg transition-colors duration-200 group/card cursor-pointer block h-full"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 group-hover/card:text-teal-600 dark:group-hover/card:text-teal-300 transition-colors">
                        {group.name}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          navigator.clipboard.writeText(group.joinCode);
                          toast.success(`Copied "${group.joinCode}"`);
                        }}
                        className="inline-flex items-center gap-1 text-[10px] font-mono bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-gray-200 px-2 py-1 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:bg-teal-50 dark:hover:bg-teal-500/15 hover:border-teal-300 dark:hover:border-teal-500/40 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                        title="Copy invite code"
                      >
                        {group.joinCode}
                        <Copy size={9} />
                      </button>
                    </div>

                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-teal-500 shrink-0" />
                        <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Wallet size={14} className="text-emerald-500 shrink-0" />
                        <span>Threshold: {group.settlementThreshold > 0 ? formatCurrency(group.settlementThreshold) : 'None'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <Clock size={12} className="shrink-0" />
                        <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/[0.05] flex items-center justify-between text-xs text-teal-600 dark:text-teal-400 font-medium opacity-0 group-hover/card:opacity-100 transition-opacity">
                      <span>Open group</span>
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </motion.section>

      {/* Recent Expenses & Pending Settlements */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid sm:grid-cols-2 gap-6 mt-10"
        >
          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
              <Wallet size={16} className="text-emerald-500" /> Recent Expenses
            </h3>
            {recentExpenses.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No expenses yet.</p>
            ) : (
              <div className="space-y-2">
                {recentExpenses.map((exp) => (
                  <Link
                    key={exp._id}
                    to={`/groups/${exp.groupId}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] hover:bg-teal-50 dark:hover:bg-teal-500/10 hover:translate-x-1 transition-all duration-200"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">{exp.description}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1.5">
                        <span className="truncate">{exp.groupName} • {exp.paidBy?.name}</span>
                        {exp.isRecurring && <RefreshCw size={9} className="text-emerald-500 shrink-0" />}
                        {exp.status && (
                          <span className={`px-1.5 py-0 rounded text-[9px] shrink-0 ${
                            exp.status === 'approved' ? 'text-emerald-600 dark:text-emerald-400' : exp.status === 'pending' ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {exp.status}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums shrink-0">
                      {formatCurrency(exp.totalAmount)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-50 mb-4 flex items-center gap-2">
              <ArrowDownRight size={16} className="text-teal-500" /> Pending Settlements
            </h3>
            {pendingSettlements.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-gray-500">You're all settled!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingSettlements.map((s, i) => {
                  const youOwe = s.from === user?._id;
                  return (
                    <Link
                      key={i}
                      to={`/groups/${s.groupId}`}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/[0.02] hover:bg-teal-50 dark:hover:bg-teal-500/10 hover:translate-x-1 transition-all duration-200"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                          {youOwe ? (
                            <>
                              <span className="text-gray-700 dark:text-gray-300">You owe</span>
                              <span className="text-gray-900 dark:text-gray-50">{s.toName}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-gray-900 dark:text-gray-50">{s.fromName}</span>
                              <span className="text-gray-700 dark:text-gray-300">owes you</span>
                            </>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{s.groupName}</p>
                      </div>
                      <span className={`text-sm font-mono font-semibold tabular-nums shrink-0 ${youOwe ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {youOwe ? '-' : '+'}{formatCurrency(s.amount)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default Dashboard;
