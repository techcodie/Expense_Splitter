import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
      navigate('/dashboard');
    } catch (err) {
      setApiError(err.response?.data?.error || 'Failed to create group.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <div className="card max-w-lg w-full">
        <h2 className="text-2xl font-bold text-center mb-2">Create a Group</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-8">
          Start splitting expenses with your friends
        </p>

        {apiError && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Group Name */}
          <div>
            <label htmlFor="group-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Group Name <span className="text-red-400">*</span>
            </label>
            <input
              id="group-name"
              type="text"
              placeholder="Weekend Trip 🏖️"
              className="input-field"
              {...register('name', {
                required: 'Group name is required',
                minLength: { value: 2, message: 'At least 2 characters' },
                maxLength: { value: 100, message: 'At most 100 characters' },
              })}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-400">{errors.name.message}</p>
            )}
          </div>

          {/* Password (optional) */}
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

          {/* Settlement Threshold */}
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
                validate: (v) =>
                  v === '' || Number(v) >= 0 || 'Must be a non-negative number',
              })}
            />
            {errors.settlementThreshold && (
              <p className="mt-1 text-xs text-red-400">{errors.settlementThreshold.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Notifications trigger when a balance exceeds this amount. 0 = always notify.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full disabled:opacity-50"
          >
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
      </div>
    </div>
  );
}

export default CreateGroup;