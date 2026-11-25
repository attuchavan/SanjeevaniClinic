import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('clinic_auth_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('clinic_auth_token') || null);
  const [loading, setLoading] = useState(true);

  // Verify stored session on app startup
  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('clinic_auth_token');
      if (!storedToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data?.success && res.data?.data?.user) {
          setUser(res.data.data.user);
          localStorage.setItem('clinic_auth_user', JSON.stringify(res.data.data.user));
        } else {
          throw new Error('Invalid user payload');
        }
      } catch (err) {
        console.warn('[AuthContext] Session expired or invalid. Logging out.');
        localStorage.removeItem('clinic_auth_token');
        localStorage.removeItem('clinic_auth_user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    verifySession();
  }, []);

  const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data?.success && response.data?.data) {
      const { token: newToken, user: newUser } = response.data.data;
      localStorage.setItem('clinic_auth_token', newToken);
      localStorage.setItem('clinic_auth_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      return newUser;
    }
    throw new Error(response.data?.message || 'Login failed');
  };

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout');
      }
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('clinic_auth_token');
      localStorage.removeItem('clinic_auth_user');
      setUser(null);
      setToken(null);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await api.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return res.data;
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    role: user?.role || null,
    loading,
    login,
    logout,
    changePassword,
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

