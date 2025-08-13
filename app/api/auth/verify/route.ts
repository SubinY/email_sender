import { NextRequest } from 'next/server';
import { authenticateUser } from '@/lib/auth/middleware';
import { successResponse, unauthorizedResponse } from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateUser(request);
    
    if (!user) {
      return unauthorizedResponse();
    }

    logger.debug('Token verification successful', { userId: user.userId });

    return successResponse({
      user: {
        id: user.userId,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    logger.error('Token verification error', error);
    return unauthorizedResponse('令牌验证失败');
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 