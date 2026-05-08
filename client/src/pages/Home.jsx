import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Tilt from 'react-parallax-tilt';
import { useAuth } from '../context/AuthContext';
import { Zap, BarChart3, RefreshCw, ArrowRight, Sparkles, TrendingDown, Shield } from 'lucide-react';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

function Home() {
  const { user } = useAuth();

  const features = [
    {
      icon: Zap,
      title: 'Minimize Transactions',
      desc: 'Our algorithm reduces the number of payments needed to settle all debts.',
      tint: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      ring: 'ring-amber-500/20',
    },
    {
      icon: BarChart3,
      title: 'Visual Debt Graphs',
      desc: 'See before & after simplification with interactive debt visualizations.',
      tint: 'text-teal-500',
      bg: 'bg-teal-50 dark:bg-teal-500/10',
      ring: 'ring-teal-500/20',
    },
    {
      icon: RefreshCw,
      title: 'Recurring & Partial',
      desc: 'Handle recurring expenses and partial payments with ease.',
      tint: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      ring: 'ring-emerald-500/20',
    },
  ];

  const stats = [
    { value: '90%', label: 'Fewer transactions', icon: TrendingDown, tint: 'text-emerald-500' },
    { value: '5sec', label: 'Average settle time', icon: Zap, tint: 'text-amber-500' },
    { value: '100%', label: 'Friendship intact', icon: Shield, tint: 'text-teal-500' },
  ];

  return (
    <div className="relative overflow-hidden">
      <section className="max-w-5xl mx-auto px-4 py-20 sm:py-28 text-center">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div
            variants={item}
            whileHover={{ scale: 1.04 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-300 text-sm font-medium mb-8 cursor-default"
          >
            <Sparkles size={14} />
            Graph-Optimized Settlements
          </motion.div>

          <motion.h1
            variants={item}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight"
          >
            Split Expenses,{' '}
            <span className="gradient-text">Not Friendships</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="max-w-2xl mx-auto text-lg text-gray-700 dark:text-gray-300 mb-10 leading-relaxed"
          >
            PeerFlow uses graph algorithms to minimize settlement transactions.
            No more payment chaos — just clean, optimized debts.
          </motion.p>

          <motion.div
            variants={item}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            {user ? (
              <Link to="/dashboard" className="btn-primary text-base px-8 py-3.5 gap-2">
                Go to Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn-primary text-base px-8 py-3.5">
                  Get Started Free
                </Link>
                <Link to="/login" className="btn-secondary text-base px-8 py-3.5 gap-2">
                  Sign In <ArrowRight size={16} />
                </Link>
              </>
            )}
          </motion.div>

        </motion.div>

        {/* Feature cards */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="mt-20 grid sm:grid-cols-3 gap-5 text-left"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={item}>
              <Tilt
                tiltMaxAngleX={5}
                tiltMaxAngleY={5}
                glareEnable
                glareMaxOpacity={0.08}
                glareColor="#c7d2fe"
                glarePosition="all"
                scale={1.02}
                transitionSpeed={1800}
                className="h-full"
              >
                <div className="card-hover h-full group cursor-default">
                  <div className={`p-3 rounded-xl ${f.bg} w-fit mb-4 ${f.tint} ring-1 ${f.ring} group-hover:scale-110 transition-transform duration-300`}>
                    <f.icon size={22} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-2">
                    {f.title}
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </Tilt>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-16 grid grid-cols-3 gap-4 max-w-3xl mx-auto"
        >
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/60 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
              <s.icon size={20} className={s.tint} />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-50 tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 text-center">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>
    </div>
  );
}

export default Home;
