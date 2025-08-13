import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    // 在实际应用中，这里应该：
    // 1. 从数据库中删除对应的 session 记录
    // 2. 将 token 加入黑名单
    // 3. 清理相关缓存
    
    logger.info('User logout');
    
    return successResponse({ 
      message: '退出登录成功' 
    });
    
  } catch (error) {
    logger.error('Logout error', error);
    return successResponse({ 
      message: '退出登录成功' 
    });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 