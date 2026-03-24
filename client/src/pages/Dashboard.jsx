import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { formatCurrency } from '../utils/money';
import { Users, Plus, UserPlus, Wallet, ArrowDownRight, Clock, TrendingUp } from 'lucide-react';

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

  // Mini financial overview
  const overview = useMemo(() => {
    const totalOwed = allBalances.filter((b) => b.net > 0).reduce((s, b) => s + b.net, 0);
    const totalOwe = allBalances.filter((b) => b.net < 0).reduce((s, b) => s + Math.abs(b.net), 0);
    const netPosition = totalOwed - totalOwe;
    return { totalOwed, totalOwe, netPosition };
  }, [allBalances]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="animate-fade-in flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-1">Welcome, {user?.name} 👋</h1>
          <p className="text-gray-500 dark:text-gray-400">Your groups and expenses at a glance.</p>
        </div>
        <div className="flex gap-3 mt-4 sm:mt-0">
          <Link to="/groups/create" className="btn-primary text-sm gap-1.5">
            <Plus size={16} /> Create Group
          </Link>
          <Link to="/groups/join" className="btn-secondary text-sm gap-1.5">
            <UserPlus size={16} /> Join Group
          </Link>
        </div>
      </div>

      {/* Financial Overview Cards */}
      {!loading && groups.length > 0 && (
        <div className="animate-fade-in grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-2xl border bg-gradient-to-br from-primary-500/15 to-primary-600/5 border-primary-500/20 dark:border-primary-500/15 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              <Users size={13} /> Groups
            </div>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">{groups.length}</p>
          </div>
          <div className="rounded-2xl border bg-gradient-to-br from-green-500/15 to-green-600/5 border-green-500/20 dark:border-green-500/15 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              <TrendingUp size={13} /> Owed to You
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums">{formatCurrency(overview.totalOwed)}</p>
          </div>
          <div className="rounded-2xl border bg-gradient-to-br from-red-500/15 to-red-600/5 border-red-500/20 dark:border-red-500/15 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              <ArrowDownRight size={13} /> You Owe
            </div>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400 tabular-nums">{formatCurrency(overview.totalOwe)}</p>
          </div>
          <div className={`rounded-2xl border bg-gradient-to-br p-4 backdrop-blur-sm ${
            overview.netPosition >= 0
              ? 'from-cyan-500/15 to-cyan-600/5 border-cyan-500/20 dark:border-cyan-500/15'
              : 'from-orange-500/15 to-orange-600/5 border-orange-500/20 dark:border-orange-500/15'
          }`}>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
              <Wallet size={13} /> Net Position
            </div>
            <p className={`text-2xl font-bold tabular-nums ${overview.netPosition >= 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-orange-600 dark:text-orange-400'}`}>
              {overview.netPosition >= 0 ? '+' : ''}{formatCurrency(Math.abs(overview.netPosition))}
            </p>
          </div>
        </div>
      )}

      {/* Groups */}
      <section className="animate-fade-in">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">My Groups</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map((group) => (
              <Link
                to={`/groups/${group._id}`}
                key={group._id}
                className="card hover:border-primary-300 dark:hover:border-gray-700/50 hover:-translate-y-0.5 transition-all duration-300 group/card cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover/card:text-primary-600 dark:group-hover/card:text-primary-300 transition-colors">
                    {group.name}
                  </h3>
                  <span className="text-[10px] font-mono bg-gray-100 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700/50">
                    {group.joinCode}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users size={14} />
                    <span>{group.members?.length || 0} member{(group.members?.length || 0) !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Wallet size={14} />
                    <span>Threshold: {group.settlementThreshold > 0 ? formatCurrency(group.settlementThreshold) : 'None'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-xs">
                    <Clock size={12} />
                    <span>Created {new Date(group.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Expenses & Pending Settlements */}
      {!loading && (
        <div className="grid sm:grid-cols-2 gap-6 mt-10 animate-fade-in-delay">
          <div className="card">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <Wallet size={16} className="text-accent-500 dark:text-accent-400" /> Recent Expenses
            </h3>
            {recentExpenses.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No expenses yet.</p>
            ) : (
              <div className="space-y-2.5">
                {recentExpenses.map((exp) => (
                  <Link
                    to={`/groups/${exp.groupId}`}
                    key={exp._id}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all duration-200"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{exp.description}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1">
                        {exp.groupName} • {exp.paidBy?.name} • {new Date(exp.createdAt).toLocaleDateString()}
                        {exp.isRecurring && (
                          <span className="text-accent-500 dark:text-accent-400">🔄</span>
                        )}
                        {exp.status && (
                          <span className={`ml-1 px-1.5 py-0 rounded text-[9px] ${
                            exp.status === 'approved' ? 'text-green-600 dark:text-green-400' : exp.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {exp.status}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-mono font-semibold text-accent-600 dark:text-accent-400 ml-3 tabular-nums">
                      {formatCurrency(exp.totalAmount)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <ArrowDownRight size={16} className="text-primary-500 dark:text-primary-400" /> Pending Settlements
            </h3>
            {pendingSettlements.length === 0 ? (
              <div className="text-center py-6">
                <span className="text-2xl block mb-2">✅</span>
                <p className="text-sm text-gray-500">You're all settled!</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingSettlements.map((s, i) => {
                  const youOwe = s.from === user?._id;
                  return (
                    <Link
                      to={`/groups/${s.groupId}`}
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-all duration-200"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {youOwe ? (
                            <>
                              <span className="text-red-600 dark:text-red-400">You</span>
                              <span className="text-gray-400"> → </span>
                              <span className="text-green-600 dark:text-green-400">{s.toName}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-red-600 dark:text-red-400">{s.fromName}</span>
                              <span className="text-gray-400"> → </span>
                              <span className="text-green-600 dark:text-green-400">You</span>
                            </>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{s.groupName}</p>
                      </div>
                      <span className={`text-sm font-mono font-semibold ml-3 tabular-nums ${youOwe ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        {youOwe ? '-' : '+'}{formatCurrency(s.amount)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;