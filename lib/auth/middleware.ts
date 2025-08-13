import { NextRequest } from 'next/server';
import { verifyToken } from './jwt';
import { logger } from '../utils/logger';

export interface AuthUser {
  userId: string;
  username: string;
  email: string;
  role: 'admin' | 'manager' | 'operator';
}

export async function authenticateUser(request: NextRequest): Promise<AuthUser | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
    
    const payload = verifyToken(token);
    if (!payload) {
      return null;
    }

    return {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      role: payload.role
    };
    
  } catch (error) {
    logger.error('Authentication error:', error);
    return null;
  }
}

// 权限检查
export function checkPermission(userRole: string, requiredPermission: string): boolean {
  const permissions = {
    admin: [
      'users:read', 'users:create', 'users:update', 'users:delete',
      'receive-emails:read', 'receive-emails:create', 'receive-emails:update', 'receive-emails:delete',
      'send-emails:read', 'send-emails:create', 'send-emails:update', 'send-emails:delete',
      'send-tasks:read', 'send-tasks:create', 'send-tasks:update', 'send-tasks:delete',
      'email-logs:read'
    ],
    manager: [
      'receive-emails:read', 'receive-emails:create', 'receive-emails:update',
      'send-emails:read', 'send-emails:create', 'send-emails:update',
      'send-tasks:read', 'send-tasks:create', 'send-tasks:update',
      'email-logs:read'
    ],
    operator: [
      'receive-emails:read',
      'send-emails:read',
      'send-tasks:read',
      'email-logs:read'
    ]
  };

  const userPermissions = permissions[userRole as keyof typeof permissions] || [];
  return userPermissions.includes(requiredPermission);
} 