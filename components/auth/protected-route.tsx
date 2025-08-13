'use client';

import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { LoginForm } from './login-form';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAuth?: boolean;
}

export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { user, isLoading, checkAuth } = useAuth();

  useEffect(() => {
    if (requireAuth && !user && !isLoading) {
      checkAuth();
    }
  }, [requireAuth, user, isLoading, checkAuth]);

  // 显示加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  // 如果需要认证但用户未登录，显示登录页面
  if (requireAuth && !user) {
    return <LoginForm />;
  }

  // 认证通过或不需要认证，显示子组件
  return <>{children}</>;
} 