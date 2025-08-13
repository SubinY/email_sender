'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'operator';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 存储工具函数
const storage = {
  setTokens: (tokens: AuthTokens) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
    }
  },
  getTokens: (): AuthTokens | null => {
    if (typeof window === 'undefined') return null;
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    if (accessToken && refreshToken) {
      return { accessToken, refreshToken };
    }
    return null;
  },
  clearTokens: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 登录函数
  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();

      if (result.success) {
        const { user: userData, tokens: tokenData } = result.data;
        setUser(userData);
        setTokens(tokenData);
        storage.setTokens(tokenData);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: result.error?.message || '登录失败' 
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: '网络错误，请稍后重试' 
      };
    }
  };

  // 登出函数
  const logout = async (): Promise<void> => {
    try {
      if (tokens?.accessToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setTokens(null);
      storage.clearTokens();
    }
  };

  // 检查认证状态
  const checkAuth = async (): Promise<boolean> => {
    const storedTokens = storage.getTokens();
    
    if (!storedTokens?.accessToken) {
      setIsLoading(false);
      return false;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${storedTokens.accessToken}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setUser(result.data.user);
        setTokens(storedTokens);
        return true;
      } else {
        storage.clearTokens();
        return false;
      }
    } catch (error) {
      console.error('Auth check error:', error);
      storage.clearTokens();
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 初始化时检查认证状态
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      tokens,
      isLoading,
      login,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 