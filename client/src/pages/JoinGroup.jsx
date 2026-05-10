import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { CheckCircle2 } from 'lucide-react';
import api from '../api/axios';

function JoinGroup() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const [joinedGroup, setJoinedGroup] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      setApiError('');
      const payload = { joinCode: data.joinCode.trim().toUpperCase() };
      if (data.password && data.password.trim()) {
        payload.password = data.password;
      }
      const res = await api.post('/groups/join', payload);
      const group = res.data.data.group;
      setJoinedGroup(group);
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#14b8a6', '#5eead4', '#fbbf24', '#10b981'] });
      toast.success(`Joined "${group.name}"!`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to join group.';
      setApiError(msg);
      toast.error(msg);
    }
  };

  if (joinedGroup) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="card max-w-md w-full text-center"
        >
          <motion.div
            className="mb-4 flex justify-center"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.15 }}
          >
            <span className="p-3 rounded-2xl bg-emerald-500/15 text-emerald-500">
              <CheckCircle2 size={36} strokeWidth={1.8} />
            </span>
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">You're In!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You've joined <span className="text-teal-600 dark:text-teal-300 font-semibold">{joinedGroup.name}</span>
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Go to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="card max-w-md w-full"
      >
        <h2 className="text-2xl font-bold text-center mb-2">Join a Group</h2>
        <p className="text-gray-600 dark:text-gray-300 text-center text-sm mb-8">
          Enter the group's join code to get started
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
            <label htmlFor="join-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Join Code <span className="text-red-400">*</span>
            </label>
            <input
              id="join-code"
              type="text"
              placeholder="e.g. A1B2C3D4"
              className="input-field uppercase tracking-widest text-center text-lg font-mono"
              {...register('joinCode', { required: 'Join code is required' })}
            />
            <AnimatePresence>
              {errors.joinCode && (
                <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1 text-xs text-red-500">
                  {errors.joinCode.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div>
            <label htmlFor="join-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password <span className="text-gray-500">(if required)</span>
            </label>
            <input
              id="join-password"
              type="password"
              placeholder="Leave empty if none"
              className="input-field"
              {...register('password')}
            />
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-50">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Joining…
              </span>
            ) : (
              'Join Group'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default JoinGroup;
