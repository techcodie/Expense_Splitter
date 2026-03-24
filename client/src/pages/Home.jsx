import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, BarChart3, RefreshCw, ArrowRight, Sparkles } from 'lucide-react';

function Home() {
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary-600/10 dark:bg-primary-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-accent-600/5 dark:bg-accent-600/8 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-purple-600/5 dark:bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      <section className="max-w-5xl mx-auto px-4 py-28 sm:py-36 text-center">
        <div className="animate-fade-in inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-100 dark:bg-primary-600/10 border border-primary-200 dark:border-primary-500/20 text-primary-700 dark:text-primary-300 text-sm font-medium mb-8">
          <Sparkles size={14} className="animate-pulse" />
          Graph-Optimized Settlements
        </div>

        <h1 className="animate-fade-in text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
          Split Expenses,{' '}
          <span className="gradient-text">
            Not Friendships
          </span>
        </h1>

        <p className="animate-fade-in-delay max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400 mb-10 leading-relaxed">
          PeerFlow uses graph algorithms to minimize settlement transactions.
          No more payment chaos — just clean, optimized debts.
        </p>

        <div className="animate-fade-in-delay flex flex-col sm:flex-row items-center justify-center gap-4">
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
        </div>

        {/* Feature cards */}
        <div className="mt-24 grid sm:grid-cols-3 gap-5 text-left">
          {[
            {
              icon: Zap,
              title: 'Minimize Transactions',
              desc: 'Our algorithm reduces the number of payments needed to settle all debts.',
              color: 'text-yellow-500',
            },
            {
              icon: BarChart3,
              title: 'Visual Debt Graphs',
              desc: 'See before & after simplification with interactive debt visualizations.',
              color: 'text-primary-500',
            },
            {
              icon: RefreshCw,
              title: 'Recurring & Partial',
              desc: 'Handle recurring expenses and partial payments with ease.',
              color: 'text-accent-500',
            },
          ].map((f, i) => (
            <div
              key={f.title}
              className="card-hover group cursor-default"
              style={{ animationDelay: `${0.2 + i * 0.1}s`, animation: 'fadeInUp 0.4s ease-out both' }}
            >
              <div className={`p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 w-fit mb-4 ${f.color} group-hover:scale-110 transition-transform duration-300`}>
                <f.icon size={22} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Home;
