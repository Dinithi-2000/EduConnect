import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser } from '../services/userService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      // Check if user is logged in
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          if (isMounted) {
            setUser(parsedUser);
          }

          const result = await getCurrentUser();
          if (result?.data && isMounted) {
            localStorage.setItem('user', JSON.stringify(result.data));
            setUser(result.data);
          }
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (isMounted) {
            setUser(null);
          }
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
