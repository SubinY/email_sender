import { NextRequest } from 'next/server';
import { authenticateUser, checkPermission } from '@/lib/auth/middleware';
import { updateReceiveEmailSchema } from '@/lib/validations/receive-email';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse
} from '@/lib/utils/api-response';
import { logger } from '@/lib/utils/logger';
import db from '@/lib/db';
import { receiveEmails } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

interface RouteContext {
  params: {
    id: string;
  };
}

// GET - 获取单个接收邮箱
export async function GET(request: NextRequest, { params }: RouteContext) {
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

    const { id } = params;
    
    // 从数据库查询
    const receiveEmail = await db
      .select()
      .from(receiveEmails)
      .where(eq(receiveEmails.id, id))
      .limit(1);

    if (receiveEmail.length === 0) {
      return notFoundResponse('接收邮箱');
    }

    logger.debug('Receive email fetched', { userId: user.userId, emailId: id });

    return successResponse(receiveEmail[0]);

  } catch (error) {
    logger.error('Get receive email error', error);
    return errorResponse('INTERNAL_ERROR', '获取接收邮箱详情失败', error, 500);
  }
}

// PUT - 更新接收邮箱
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    if (!checkPermission(user.role, 'receive-emails:update')) {
      return forbiddenResponse();
    }

    const { id } = params;
    const body = await request.json();

    // 验证请求数据
    const validation = updateReceiveEmailSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.reduce((acc, error) => {
        const field = error.path.join('.');
        if (!acc[field]) acc[field] = [];
        acc[field].push(error.message);
        return acc;
      }, {} as Record<string, string[]>);
      
      return validationErrorResponse(errors);
    }

    const updateData = validation.data;

    // 检查记录是否存在
    const existingRecord = await db
      .select()
      .from(receiveEmails)
      .where(eq(receiveEmails.id, id))
      .limit(1);

    if (existingRecord.length === 0) {
      return notFoundResponse('接收邮箱');
    }

    // 如果更新邮箱地址，检查是否与其他记录冲突
    if (updateData.email) {
      const existingEmail = await db
        .select()
        .from(receiveEmails)
        .where(eq(receiveEmails.email, updateData.email))
        .limit(1);

      if (existingEmail.length > 0 && existingEmail[0].id !== id) {
        return errorResponse('EMAIL_EXISTS', '该邮箱已存在', null, 409);
      }
    }

    // 更新记录
    const updatedReceiveEmail = await db
      .update(receiveEmails)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(receiveEmails.id, id))
      .returning();

    logger.info('Receive email updated', { 
      userId: user.userId,
      emailId: id,
      updatedFields: Object.keys(updateData)
    });

    return successResponse(updatedReceiveEmail[0]);

  } catch (error) {
    logger.error('Update receive email error', error);
    return errorResponse('INTERNAL_ERROR', '更新接收邮箱失败', error, 500);
  }
}

// DELETE - 删除接收邮箱
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    // 认证检查
    const user = await authenticateUser(request);
    if (!user) {
      return unauthorizedResponse();
    }

    // 权限检查
    if (!checkPermission(user.role, 'receive-emails:delete')) {
      return forbiddenResponse();
    }

    const { id } = params;

    // 检查记录是否存在
    const existingRecord = await db
      .select()
      .from(receiveEmails)
      .where(eq(receiveEmails.id, id))
      .limit(1);

    if (existingRecord.length === 0) {
      return notFoundResponse('接收邮箱');
    }

    // 硬删除记录
    await db
      .delete(receiveEmails)
      .where(eq(receiveEmails.id, id));

    logger.info('Receive email deleted', { 
      userId: user.userId,
      emailId: id,
      email: existingRecord[0].email
    });

    return successResponse({ 
      message: '接收邮箱删除成功',
      deletedId: id
    });

  } catch (error) {
    logger.error('Delete receive email error', error);
    return errorResponse('INTERNAL_ERROR', '删除接收邮箱失败', error, 500);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
} 