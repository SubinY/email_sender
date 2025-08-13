import { NextRequest } from 'next/server';
import { loginSchema } from '@/lib/validations/auth';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth/jwt';
import { 
  successResponse, 
  errorResponse, 
  validationErrorResponse,
  unauthorizedResponse 
} from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';
import db from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    logger.info('Login attempt started');
    
    const body = await request.json();
    
    // 验证请求数据
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      logger.warn('Login validation failed', validation.error.errors);
      const errors = validation.error.errors.reduce((acc, error) => {
        const field = error.path.join('.');
        if (!acc[field]) acc[field] = [];
        acc[field].push(error.message);
        return acc;
      }, {} as Record<string, string[]>);
      
      return validationErrorResponse(errors);
    }

    const { username, password } = validation.data;

    // 从数据库查找用户
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    const user = userResult[0];
    if (!user) {
      logger.warn('Login failed - user not found', { username });
      return unauthorizedResponse('用户名或密码错误');
    }

    // 检查用户是否激活
    if (!user.isActive) {
      logger.warn('Login failed - user inactive', { username });
      return unauthorizedResponse('账户已被禁用');
    }

    // 验证密码
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      logger.warn('Login failed - invalid password', { username });
      return unauthorizedResponse('用户名或密码错误');
    }

    // 生成令牌
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    logger.info('Login successful', { userId: user.id, username, role: user.role });

    return successResponse({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    logger.error('Login error', error);
    return errorResponse(
      'INTERNAL_ERROR',
      '登录过程中发生错误',
      error,
      500
    );
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