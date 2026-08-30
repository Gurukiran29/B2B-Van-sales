import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user') || localStorage.getItem('van_sales_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || localStorage.getItem('van_sales_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token') || localStorage.getItem('van_sales_token');
      if (storedToken) {
        try {
          const res = await authApi.getMe();
          const freshUser = res.data;
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
          localStorage.setItem('van_sales_user', JSON.stringify(freshUser));
        } catch (err) {
          console.error("Auth verification failed", err);
          // Only clear if token is genuinely rejected with 401
          if (err.response && err.response.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (phoneNumber, password) => {
    const res = await authApi.login({ phoneNumber, password });
    const authData = res.data;
    setToken(authData.token);
    setUser(authData);
    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(authData));
    localStorage.setItem('van_sales_token', authData.token);
    localStorage.setItem('van_sales_user', JSON.stringify(authData));
    return authData;
  };

  const register = async (formData) => {
    const res = await authApi.register(formData);
    const authData = res.data;
    setToken(authData.token);
    setUser(authData);
    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(authData));
    localStorage.setItem('van_sales_token', authData.token);
    localStorage.setItem('van_sales_user', JSON.stringify(authData));
    return authData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('van_sales_token');
    localStorage.removeItem('van_sales_user');
  };

  const isSeller = user?.role === 'ROLE_SELLER';
  const isBuyer = user?.role === 'ROLE_BUYER';
  const isAdmin = user?.role === 'ROLE_ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token && !!user,
        isSeller,
        isBuyer,
        isAdmin,
        login,
        register,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
