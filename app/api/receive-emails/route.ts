import { NextRequest } from 'next/server';
import { authenticateUser, checkPermission } from '@/lib/auth/middleware';
import { createReceiveEmailSchema, receiveEmailQuerySchema } from '@/lib/validations/receive-email';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  calculatePagination
} from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';
import db from '@/lib/db';
import { receiveEmails } from '@/lib/db/schema';
import { eq, ilike, and, count, desc, isNull } from 'drizzle-orm';

// GET - 获取接收邮箱列表
export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    if (!checkPermission(user.role, 'receive-emails:read')) {
      return forbiddenResponse();
    }

    // 验证查询参数
    const { searchParams } = new URL(request.url);
    const queryValidation = receiveEmailQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      search: searchParams.get('search'),
      province: searchParams.get('province'),
      isBlacklisted: searchParams.get('isBlacklisted')
    });


    if (!queryValidation.success) {
      return validationErrorResponse(
        queryValidation.error.errors.reduce((acc, error) => {
          const field = error.path.join('.');
          if (!acc[field]) acc[field] = [];
          acc[field].push(error.message);
          return acc;
        }, {} as Record<string, string[]>)
      );
    }

    const { page, limit, search, province, isBlacklisted } = queryValidation.data;

    // 构建查询条件
    const conditions = [];

    if (search) {
      conditions.push(
        ilike(receiveEmails.universityName, `%${search}%`)
      );
    }

    if (province) {
      conditions.push(eq(receiveEmails.province, province));
    }

    if (isBlacklisted !== undefined) {
      conditions.push(eq(receiveEmails.isBlacklisted, isBlacklisted));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 获取总数
    const totalResult = await db
      .select({ count: count() })
      .from(receiveEmails)
      .where(whereClause);

    const total = totalResult[0].count;

    // 分页查询
    const offset = (page - 1) * limit;
    const data = await db
      .select()
      .from(receiveEmails)
      .where(whereClause)
      .orderBy(desc(receiveEmails.createdAt))
      .limit(limit)
      .offset(offset);

    const pagination = calculatePagination(page, limit, total);

    logger.info('Receive emails fetched', { 
      userId: user.userId, 
      count: data.length,
      total 
    });

    return successResponse(data, pagination);

  } catch (error) {
    logger.error('Get receive emails error', error);
    return errorResponse('INTERNAL_ERROR', '获取接收邮箱列表失败', error, 500);
  }
}

// POST - 创建接收邮箱
export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    if (!checkPermission(user.role, 'receive-emails:create')) {
      return forbiddenResponse();
    }

    const body = await request.json();

    // 验证请求数据
    const validation = createReceiveEmailSchema.safeParse(body);
    if (!validation.success) {
      logger.warn('Create receive email validation failed', validation.error.errors);
      const errors = validation.error.errors.reduce((acc, error) => {
        const field = error.path.join('.');
        if (!acc[field]) acc[field] = [];
        acc[field].push(error.message);
        return acc;
      }, {} as Record<string, string[]>);
      
      return validationErrorResponse(errors);
    }

    const data = validation.data;

    // 检查邮箱是否已存在
    const existingEmail = await db
      .select()
      .from(receiveEmails)
      .where(eq(receiveEmails.email, data.email))
      .limit(1);

    if (existingEmail.length > 0) {
      return validationErrorResponse({
        email: ['该邮箱地址已存在']
      });
    }

    // 创建新记录
    const newReceiveEmail = await db
      .insert(receiveEmails)
      .values({
        ...data,
        createdBy: user.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    logger.info('Receive email created', { 
      userId: user.userId, 
      emailId: newReceiveEmail[0].id,
      email: data.email
    });

    return successResponse(newReceiveEmail[0], undefined, 201);

  } catch (error) {
    logger.error('Create receive email error', error);
    return errorResponse('INTERNAL_ERROR', '创建接收邮箱失败', error, 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 