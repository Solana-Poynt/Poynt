import React, { createContext, useState, useEffect, useContext } from 'react';
import { getDataFromAsyncStorage, saveDataToAsyncStorage } from '~/utils/localStorage';

// Define the shape of our context
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component to wrap your app
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check for token on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await getDataFromAsyncStorage('refreshToken');
        setIsAuthenticated(!!token);
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function to store token and update state
  const login = async (token: string) => {
    try {
      await saveDataToAsyncStorage('refreshToken', token);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout function to clear token and update state
  const logout = async () => {
    try {
      await saveDataToAsyncStorage('refreshToken', '');
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  // Provide the context value
  const value = {
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook for easy context use
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
