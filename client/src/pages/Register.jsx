import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const fireConfetti = () => {
    confetti({
      particleCount: 90,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#14b8a6', '#5eead4', '#fbbf24', '#10b981'],
    });
  };

  const onSubmit = async (data) => {
    try {
      setApiError('');
      await registerUser(data);
      fireConfetti();
      toast.success(`Welcome to PeerFlow, ${data.name}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      setApiError(msg);
      toast.error(msg);
    }
  };

  const fields = [
    { id: 'reg-name', label: 'Name', type: 'text', placeholder: 'Jane Doe', name: 'name',
      rules: { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' }, maxLength: { value: 50, message: 'At most 50 characters' } } },
    { id: 'reg-email', label: 'Email', type: 'email', placeholder: 'you@example.com', name: 'email',
      rules: { required: 'Email is required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } } },
    { id: 'reg-password', label: 'Password', type: 'password', placeholder: '••••••••', name: 'password',
      rules: { required: 'Password is required', minLength: { value: 6, message: 'At least 6 characters' } } },
  ];

  return (
    <div className="relative flex items-center justify-center min-h-[calc(100vh-4rem)] px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="card max-w-md w-full"
      >
        <h2 className="text-2xl font-bold text-center mb-2">Create Account</h2>
        <p className="text-gray-600 dark:text-gray-300 text-center text-sm mb-8">
          Join <span className="gradient-text font-semibold">PeerFlow</span> and simplify your expenses
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.map((field) => (
            <div key={field.id}>
              <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {field.label}
              </label>
              <input
                id={field.id}
                type={field.type}
                placeholder={field.placeholder}
                className="input-field"
                {...register(field.name, field.rules)}
              />
              <AnimatePresence>
                {errors[field.name] && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-1 text-xs text-red-500"
                  >
                    {errors[field.name].message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          ))}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-50">
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account…
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 font-medium">
            Sign In
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default Register;
