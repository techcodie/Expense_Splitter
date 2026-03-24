import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      setJoinedGroup(res.data.data.group);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Failed to join group.');
    }
  };

  if (joinedGroup) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="card max-w-md w-full text-center">
          <span className="text-5xl mb-4 block">🎉</span>
          <h2 className="text-2xl font-bold mb-2">You're In!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            You've joined <span className="text-primary-600 dark:text-primary-300 font-semibold">{joinedGroup.name}</span>
          </p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="card max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-2">Join a Group</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-8">
          Enter the group's join code to get started
        </p>

        {apiError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Join Code */}
          <div>
            <label htmlFor="join-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Join Code <span className="text-red-400">*</span>
            </label>
            <input
              id="join-code"
              type="text"
              placeholder="e.g. A1B2C3D4"
              className="input-field uppercase tracking-widest text-center text-lg font-mono"
              {...register('joinCode', {
                required: 'Join code is required',
              })}
            />
            {errors.joinCode && (
              <p className="mt-1 text-xs text-red-400">{errors.joinCode.message}</p>
            )}
          </div>

          {/* Password (if required) */}
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

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full disabled:opacity-50"
          >
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
      </div>
    </div>
  );
}

export default JoinGroup;