import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { rupeesToPaise } from '../utils/money';

function CreateGroup() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { name: '', password: '', settlementThreshold: 0 },
  });

  const onSubmit = async (data) => {
    try {
      setApiError('');
      const payload = {
        name: data.name,
        settlementThreshold: rupeesToPaise(data.settlementThreshold || 0),
      };
      if (data.password && data.password.trim()) {
        payload.password = data.password;
      }
      await api.post('/groups', payload);
      confetti({ particleCount: 80, spread: 65, origin: { y: 0.6 }, colors: ['#14b8a6', '#10b981', '#fbbf24'] });
      toast.success(`Group "${data.name}" created!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create group.';
      setApiError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="card max-w-lg w-full"
      >
        <h2 className="text-2xl font-bold text-center mb-2">Create a Group</h2>
        <p className="text-gray-600 dark:text-gray-300 text-center text-sm mb-8">
          Start splitting expenses with your friends
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
          <div>
            <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Group Name <span className="text-red-400">*</span>
            </label>
            <input
              id="group-name"
              type="text"
              placeholder="Weekend Trip"
              className="input-field"
              {...register('name', {
                required: 'Group name is required',
                minLength: { value: 2, message: 'At least 2 characters' },
                maxLength: { value: 100, message: 'At most 100 characters' },
              })}
            />
            <AnimatePresence>
              {errors.name && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 text-xs text-red-500">
                  {errors.name.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label htmlFor="group-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password <span className="text-gray-500">(optional)</span>
            </label>
            <input
              id="group-password"
              type="password"
              placeholder="Leave empty for no password"
              className="input-field"
              {...register('password')}
            />
          </div>

          <div>
            <label htmlFor="group-threshold" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Settlement Threshold <span className="text-gray-500">(₹ in rupees)</span>
            </label>
            <input
              id="group-threshold"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="input-field"
              {...register('settlementThreshold', {
                min: { value: 0, message: 'Must be >= 0' },
                validate: (v) => v === '' || Number(v) >= 0 || 'Must be a non-negative number',
              })}
            />
            <AnimatePresence>
              {errors.settlementThreshold && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 text-xs text-red-500">
                  {errors.settlementThreshold.message}
                </motion.p>
              )}
            </AnimatePresence>
            <p className="mt-1 text-xs text-gray-500">
              Notifications trigger when a balance exceeds this amount. 0 = always notify.
            </p>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-50">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating…
              </span>
            ) : (
              'Create Group'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default CreateGroup;
