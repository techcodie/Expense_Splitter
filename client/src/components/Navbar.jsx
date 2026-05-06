import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Home, LayoutDashboard, LogOut, Menu, X, Wallet } from 'lucide-react';

const navLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#11161d]/85 border-b border-white/[0.06] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <span className="p-1.5 rounded-lg bg-teal-600 text-white">
              <Wallet size={16} strokeWidth={2.5} />
            </span>
            <span className="text-xl font-bold gradient-text">
              PeerFlow
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${
                    active
                      ? 'text-teal-300'
                      : 'text-gray-300 hover:text-gray-100'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-teal-500/10 border border-teal-500/20 -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <link.icon size={15} />
                  {link.label}
                </Link>
              );
            })}

            <div className="w-px h-6 bg-white/10 mx-2" />

            {isAuthenticated ? (
              <>
                <span className="px-3 py-2 text-sm text-gray-300 font-medium">
                  {user?.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 btn-secondary text-sm !py-2 !px-4"
                >
                  <LogOut size={14} /> Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 ${
                    pathname === '/login'
                      ? 'text-teal-300'
                      : 'text-gray-300 hover:text-gray-100'
                  }`}
                >
                  {pathname === '/login' && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-teal-500/10 border border-teal-500/20 -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm !py-2 !px-4">
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* Mobile menu */}
          <div className="md:hidden flex items-center gap-1">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-xl text-gray-300 hover:bg-white/[0.05] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="md:hidden pb-4 space-y-1 overflow-hidden"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    pathname === link.to
                      ? 'bg-teal-500/10 text-teal-300'
                      : 'text-gray-300 hover:text-gray-100 hover:bg-white/[0.05]'
                  }`}
                >
                  <link.icon size={15} />
                  {link.label}
                </Link>
              ))}

              {isAuthenticated ? (
                <>
                  <span className="block px-4 py-2.5 text-sm text-gray-300 font-medium">
                    {user?.name}
                  </span>
                  <button
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="flex items-center gap-2 w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-gray-100 hover:bg-white/[0.05] transition-colors"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-gray-100 hover:bg-white/[0.05] transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-gray-100 hover:bg-white/[0.05] transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

export default Navbar;
