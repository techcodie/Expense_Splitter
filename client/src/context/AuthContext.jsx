import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('peerflow_token'));
  const [loading, setLoading] = useState(true);

  // Load user on mount (if token exists)
  const loadUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data.user);
    } catch {
      // Token is invalid or expired
      localStorage.removeItem('peerflow_token');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const register = async ({ name, email, password }) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { user: newUser, token: newToken } = res.data.data;
    localStorage.setItem('peerflow_token', newToken);
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const login = async ({ email, password }) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: loggedInUser, token: newToken } = res.data.data;
    localStorage.setItem('peerflow_token', newToken);
    setToken(newToken);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = () => {
    localStorage.removeItem('peerflow_token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;