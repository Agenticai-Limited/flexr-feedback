import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AuthContextType, UserInfo } from '../types';
import { authAPI } from '../services/api';
import { message } from 'antd';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkUserStatus = async () => {
      const userData = await authAPI.getCurrentUser();
      if (userData?.success && userData.data.is_authenticated) {
        setIsAuthenticated(true);
        setUserInfo({
          username: userData.data.username,
          isAuthenticated: userData.data.is_authenticated,
        });
      } else {
        setIsAuthenticated(false);
        setUserInfo(null);
      }
      setIsLoading(false);
    };

    checkUserStatus();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.login(username, password);
      console.log('Login response:', response);

      if ('success' in response && response.success && response.data.access_token) {
        // After successful login, fetch user info
        const userData = await authAPI.getCurrentUser();
        if (userData?.success && userData.data.is_authenticated) {
          setIsAuthenticated(true);
          setUserInfo({
            username: userData.data.username,
            isAuthenticated: userData.data.is_authenticated
          });
          message.success('Login successful');
          return true;
        }
      }

      if ('error' in response && response.error.message) {
        message.error(`Login failed: ${response.error.message}`);
      } else {
        message.error('Login failed. Please check your credentials');
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      message.error('Login failed. An unexpected error occurred');
      return false;
    }
  };

  const logout = () => {
    authAPI.logout();
    setIsAuthenticated(false);
    setUserInfo(null);
    message.success('Logged out successfully');
  };

  const value: AuthContextType = {
    isAuthenticated,
    userInfo,
    login,
    logout,
  };

  if (isLoading) {
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};