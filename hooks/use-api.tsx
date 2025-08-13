'use client';

import { useState } from 'react';
import { useAuth } from './use-auth';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UseApiOptions {
  showErrorToast?: boolean;
}

export function useApi(options: UseApiOptions = {}) {
  const { tokens, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const request = async <T = any>(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<ApiResponse<T>> => {
    setLoading(true);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };

      if (tokens?.accessToken) {
        headers.Authorization = `Bearer ${tokens.accessToken}`;
      }

      const config: RequestInit = {
        method,
        headers
      };

      if (data && method !== 'GET') {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(url, config);
      const result = await response.json();

      // 如果是401错误（未认证），自动登出
      if (response.status === 401) {
        logout();
        return {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: '认证已过期，请重新登录'
          }
        };
      }

      return result;

    } catch (error) {
      console.error('API request error:', error);
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: '网络错误，请检查网络连接'
        }
      };
    } finally {
      setLoading(false);
    }
  };

  const get = <T = any>(url: string) => request<T>(url, 'GET');
  const post = <T = any>(url: string, data: any) => request<T>(url, 'POST', data);
  const put = <T = any>(url: string, data: any) => request<T>(url, 'PUT', data);
  const del = <T = any>(url: string) => request<T>(url, 'DELETE');

  return {
    request,
    get,
    post,
    put,
    delete: del,
    loading
  };
} 