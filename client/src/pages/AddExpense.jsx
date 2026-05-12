import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { Scale, Pencil } from 'lucide-react';
import api from '../api/axios';
import { rupeesToPaise, formatCurrency } from '../utils/money';

function AddExpense() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [apiError, setApiError] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [customShares, setCustomShares] = useState({});
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await api.get('/groups');
        const found = res.data.data.groups.find((g) => g._id === groupId);
        if (found) {
          setGroup(found);
          setSelectedMembers(found.members.map((m) => m._id));
        }
      } catch (err) {
        setApiError('Failed to load group.');
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [groupId]);

  const toggleMember = (memberId) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleCustomShareChange = (memberId, value) => {
    setCustomShares((prev) => ({ ...prev, [memberId]: value }));
  };

  const onSubmit = async (data) => {
    try {
      setApiError('');
      const totalAmountPaise = rupeesToPaise(data.totalAmount);

      if (totalAmountPaise < 1) {
        setApiError('Amount must be at least ₹0.01');
        return;
      }

      const payload = {
        group: groupId,
        description: data.description,
        totalAmount: totalAmountPaise,
        paidBy: data.paidBy,
        isRecurring: data.isRecurring || false,
      };

      if (data.isRecurring && data.frequency) {
        payload.recurrence = { frequency: data.frequency, interval: 1 };
      }

      if (splitType === 'equal') {
        if (selectedMembers.length === 0) {
          setApiError('Select at least one member to split with.');
          return;
        }
        payload.equalSplit = true;
        payload.splitUsers = selectedMembers;
      } else {
        const splits = selectedMembers.map((uid) => ({
          user: uid,
          shareAmount: rupeesToPaise(customShares[uid] || 0),
        }));

        const splitSum = splits.reduce((acc, s) => acc + s.shareAmount, 0);
        if (splitSum !== totalAmountPaise) {
          setApiError(
            `Shares total ${formatCurrency(splitSum)} but expense is ${formatCurrency(totalAmountPaise)}. They must match.`
          );
          return;
        }

        payload.equalSplit = false;
        payload.splits = splits;
      }

      await api.post('/expenses', payload);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 }, colors: ['#14b8a6', '#10b981', '#fbbf24'] });
      toast.success('Expense added!');
      navigate(`/groups/${groupId}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to add expense.';
      setApiError(msg);
      toast.error(msg);
    }
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
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p className="text-red-500">Group not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <button
        onClick={() => navigate(-1)}
        className="text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 text-sm mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back
      </button>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="card"
      >
        <h2 className="text-2xl font-bold mb-1">Add Expense</h2>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
          to <span className="text-teal-600 dark:text-teal-300 font-semibold">{group.name}</span>
        </p>

        <AnimatePresence>
          {apiError && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm overflow-hidden"
            >
              {apiError}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Description */}
          <div>
            <label htmlFor="exp-desc" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description <span className="text-red-400">*</span>
            </label>
            <input
              id="exp-desc"
              type="text"
              placeholder="Dinner, cab fare, groceries…"
              className="input-field"
              {...register('description', { required: 'Description is required' })}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
            )}
          </div>

          {/* Total Amount */}
          <div>
            <label htmlFor="exp-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount (₹) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₹</span>
              <input
                id="exp-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                className="input-field pl-8"
                {...register('totalAmount', {
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Must be > 0' },
                })}
              />
            </div>
            {errors.totalAmount && (
              <p className="mt-1 text-xs text-red-500">{errors.totalAmount.message}</p>
            )}
          </div>

          {/* Paid By */}
          <div>
            <label htmlFor="exp-paidby" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Paid By <span className="text-red-400">*</span>
            </label>
            <select
              id="exp-paidby"
              className="input-field"
              {...register('paidBy', { required: 'Select who paid' })}
            >
              <option value="">Select member</option>
              {group.members.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>
            {errors.paidBy && (
              <p className="mt-1 text-xs text-red-500">{errors.paidBy.message}</p>
            )}
          </div>

          {/* Split Type Toggle with animated indicator */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Split Type</label>
            <div className="inline-flex bg-gray-100 dark:bg-gray-800/60 p-1 rounded-xl border border-gray-200 dark:border-gray-700/50">
              {[
                { key: 'equal', label: 'Equal', icon: Scale },
                { key: 'custom', label: 'Custom', icon: Pencil },
              ].map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSplitType(opt.key)}
                  className={`relative inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    splitType === opt.key
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {splitType === opt.key && (
                    <motion.span
                      layoutId="split-pill"
                      className="absolute inset-0 rounded-lg bg-teal-600 -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <opt.icon size={14} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Member Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Split Among
            </label>
            <div className="space-y-2">
              {group.members.map((m) => (
                <div key={m._id} className="flex items-center gap-3">
                  <label className="flex items-center gap-3 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(m._id)}
                      onChange={() => toggleMember(m._id)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500 bg-white dark:bg-gray-800"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-50">{m.name}</span>
                  </label>

                  <AnimatePresence>
                    {splitType === 'custom' && selectedMembers.includes(m._id) && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 128 }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="relative overflow-hidden"
                      >
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs z-10">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={customShares[m._id] || ''}
                          onChange={(e) => handleCustomShareChange(m._id, e.target.value)}
                          className="input-field !py-1.5 !text-sm pl-6 w-32"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="exp-recurring"
              className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-teal-600 focus:ring-teal-500 bg-white dark:bg-gray-800"
              {...register('isRecurring')}
            />
            <label htmlFor="exp-recurring" className="text-sm text-gray-700 dark:text-gray-300">
              Recurring expense
            </label>
          </div>

          {/* Frequency */}
          <div>
            <select className="input-field" {...register('frequency')}>
              <option value="">Select frequency</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* Submit */}
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-50">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding…
              </span>
            ) : (
              'Add Expense'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default AddExpense;
